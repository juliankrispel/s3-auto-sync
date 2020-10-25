#!/usr/bin/env node
import S3 from 'aws-sdk/clients/s3'
import STS from 'aws-sdk/clients/sts'
import AWS from 'aws-sdk'
import chokidar from 'chokidar'
import { promises as fs, createReadStream } from 'fs'
import p from 'path'
import { program } from 'commander'
import inquirer from 'inquirer'
import c from 'chalk'

const sts = new STS()

const fileCreds = new AWS.SharedIniFileCredentials()
const { version, name } = require('../package')
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

console.clear()
console.log(c.green(`running ${name}@${version}`))

const s3 = new S3()
const bucketReg = /(?=^.{3,63}$)(?!^(\d+\.)+\d+$)(^(([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$)/

async function getBucketNames() {
  const { Buckets } = await s3.listBuckets().promise()
  const buckets = Buckets != null ?
    (Buckets
    .filter(bucket => bucket != null && bucket.Name != null)
    .map(b => b.Name)) as string[]
     : null

  if (buckets == null) {
    return []
  } else {
    return buckets
  }

}

async function createBucket ({ name, region }: { name?: string, region: string }): Promise<string> {
  let Bucket
  if (!name) {
    let { bucketName } = await inquirer.prompt([{
      type: 'input',
      name: 'bucketName',
      validate: async (name) => {
        if (!bucketReg.test(name)) {
          return 'must be a valid bucket name -> https://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html'
        }
        return true
      }
    }])
    try {
      console.log(c.green(`Creating bucket ${bucketName} in region: ${region}`))
      await s3.createBucket({
        Bucket: bucketName,
        CreateBucketConfiguration: {
          LocationConstraint: region
        }
      }).promise()
    } catch (err) {
      console.log(c.red(err.message))
      bucketName = createBucket({ name, region }) 
    }
    return bucketName
  } else if (!bucketReg.test(name)) {
    console.error('must be a valid bucket name -> https://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html')
    const bucket = await createBucket({ region })
    return bucket
  } else {
    let bucketName: string = name
    await s3.createBucket({
      Bucket: name
    }).promise()
    return bucketName
  }
}

async function makeBucketName({ name, region }: { name?: string, region: string, }) {
  if (name != null) {
    const bucketName = await createBucket({ name, region })
    return bucketName
  } else {

    const { createNew } = await inquirer.prompt([{
      type: 'confirm',
      message: 'Would you like a new bucket?',
      name: 'createNew',
    }])

    if (createNew) {
      const bucketName = await createBucket({ region })
      return bucketName
    } else {

    const buckets = await getBucketNames()
    const { bucketName } = await inquirer.prompt([{
      type: 'autocomplete',
      name: 'bucketName',
      message: 'Which s3 bucket would you like to sync?',
      source: (answersSoFar: any, input: any) => {
        if (typeof input == 'string' && input.length > 0) {
          return buckets.filter((bucket: string) => bucket.includes(input))
        } else {
          return buckets
        }
      }
    }])
      return bucketName
    }
  }
}

async function makeDir(dirName?: string): Promise<string> {
  if (dirName == null) {
    const { dir } = await inquirer.prompt([{
      type: 'autocomplete',
      name: 'dir',
      message: 'Select a path to watch (Can be file or folder)',
      source: async (answersSoFar: any, input: any) => {
        const _input = input || '.'
        const dirname = p.dirname(_input.replace(/\/$/, '/.'))
        const possibleMatches = await fs.readdir(dirname)
        const dirs = possibleMatches
          .filter(file => {
            const name = p.relative(dirname, input || '')
            return file.includes(name)
          })

        return ['.'].concat(dirs)
      }
    }])

    return dir as string
  } else {
    const stat = await fs.stat(dirName)
    if (!stat.isDirectory() && !stat.isFile()) {
      console.error(`Path ${dirName} doesn't exist, please choose one which does or create one`)
      const dir = await makeDir()
      return dir
    }
    return dirName
  }
}

type Progress = {
  [key: string]: string
}

async function renderProgress({ bucket, dir, files }: { bucket: string, dir: string, files: Progress }) {
  console.clear()
  console.log(`${c.grey('s3-auto-sync: ')} ${dir} > s3://${bucket}`)
  Object.keys(files).forEach(key => {
    console.log(`${key}: ${c.white(files[key])}`)
  })
}

async function watchAndSync(Bucket: string, dir: string) {
  console.clear()
  const files: Progress = {}

  chokidar.watch(dir, { ignored: /\.DS_Store$/}).on('add', async (path) => {
    const file = createReadStream(path)
    const Key = p.relative(dir, path)
    files[Key] = '0%'
    renderProgress({ bucket: Bucket , dir, files })
    const upload = new S3.ManagedUpload({
      params: {
        Bucket,
        Key, 
        Body: file,
      },
    })
    upload.on('httpUploadProgress', (prog) => {
      const percent = Math.round((prog.loaded / prog.total) * 100)
      files[Key] = `${percent}%`
      renderProgress({ bucket: Bucket , dir, files })
    })
    upload.send()
    await upload.promise()
  }).on('unlink', async (path) => {
    const Key = p.relative(dir, path)

    await s3.deleteObject({
      Bucket,
      Key: path
    }).promise()
    files[Key] = `Removed`
    renderProgress({ bucket: Bucket , dir, files })
  });
}


async function run () {
  const id = await sts.getCallerIdentity().promise()

  program
    .option('-r --region <region>')
    .option('-d --dir <dir>')
    .option('-b --bucket <bucket>')
    .parse(process.argv);

  const options: { bucket?: string, dir?: string, region?: string} = program.opts()
  const region = options.region != null ? options.region : process.env.AWS_REGION;
  if (region == null) {
    throw new Error("AWS_REGION env is not set")
  }
  const dirName = await makeDir(options.dir)
  const bucketName = await makeBucketName({ region, name: options.bucket })
  watchAndSync(bucketName, dirName)
}

run()
