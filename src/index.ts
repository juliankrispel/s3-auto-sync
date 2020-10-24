#!/usr/bin/env node
import S3 from 'aws-sdk/clients/s3'
import AWS from 'aws-sdk'
import chokidar from 'chokidar'
import { promises as fs, createReadStream } from 'fs'
import p  from 'path'
import { program } from 'commander'
import inquirer from 'inquirer'

const iam = new AWS.IAM()
const { version, name } = require('../package')
inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

console.info(`${name}@${version}`)
const s3 = new S3()
const bucketReg = /(?=^.{3,63}$)(?!^(\d+\.)+\d+$)(^(([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$)/

async function getBucketNames() {
  const { Buckets } = await s3.listBuckets().promise()
  return (Buckets || []).map((b) => b.Name)
}

async function createBucket (name?: string): Promise<string> {
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
      await s3.createBucket({
        Bucket: bucketName
      }).promise()
    } catch (err) {
      console.error(err.message)
      bucketName = createBucket(name) 
    }
    return bucketName
  } else if (!bucketReg.test(name)) {
    console.error('must be a valid bucket name -> https://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html')
    const bucket = await createBucket()
    return bucket
  } else {
    let bucketName: string = name
    await s3.createBucket({
      Bucket: name
    }).promise()
    return bucketName
  }
}

async function makeBucketName(name?: string) {
  if (name != null) {
    const bucketName = await createBucket(name)
    return bucketName
  } else {

    const { useExisting } = await inquirer.prompt([{
      type: 'confirm',
      message: 'Would you like choose an existing bucket? (no to create one)',
      name: 'useExisting',
    }])

    if (!useExisting) {
      const bucketName = await createBucket()
      return bucketName
    } else {
      const bucketNames = await getBucketNames()
      const { bucketName } = await inquirer.prompt([{
        type: 'list',
        name: 'bucketName',
        description: 'Which bucket would you like to upload to',
        choices: bucketNames
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
      message: 'Select a directory to watch',
      source: async (answersSoFar: any, input: any) => {
        const _input = input || '.'
        const dirname = p.dirname(_input.replace(/\/$/, '/.'))
        const possibleMatches = await fs.readdir(dirname)
        const dirs = possibleMatches
          .filter(file => {
            const name = p.relative(dirname, input || '')
            return file.includes(name)
          })

        return dirs
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

async function renderProgress(prog: Progress) {
  console.clear()
  Object.keys(prog).forEach(key => {
    console.log(`${key}: ${prog[key]}`)
  })
}

async function watchAndSync(Bucket: string, dir: string) {
  console.clear()
  const files: Progress = {}

  chokidar.watch(dir, { ignored: /\.DS_Store$/}).on('add', async (path) => {
    const file = createReadStream(path)
    const Key = p.relative(dir, path)
    files[Key] = '0%'
    renderProgress(files)
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
      renderProgress(files)
    })
    upload.send()
    await upload.promise()
    //console.log({ uploading: path })
    //console.info({ uploaded: path })
  }).on('unlink', async (path) => {
    const Key = p.relative(dir, path)

    await s3.deleteObject({
      Bucket,
      Key: path
    }).promise()
    files[Key] = `Removed`
    renderProgress(files)
  });
}

async function run () {
  // const user = await iam.getUser().promise()
  // console.log(user)

  program
    .option('-d --dir <dir>')
    .option('-b --bucket <bucket>')
    .parse(process.argv);

  const options: { bucket?: string, dir?: string} = program.opts()
  console.log(options.bucket)
  const dirName = await makeDir(options.dir)
  const bucketName = await makeBucketName(options.bucket)
  watchAndSync(bucketName, dirName)
}

run()
