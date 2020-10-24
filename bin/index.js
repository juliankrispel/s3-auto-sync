#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var s3_1 = __importDefault(require("aws-sdk/clients/s3"));
var aws_sdk_1 = __importDefault(require("aws-sdk"));
var chokidar_1 = __importDefault(require("chokidar"));
var fs_1 = require("fs");
var path_1 = __importDefault(require("path"));
var commander_1 = require("commander");
var inquirer_1 = __importDefault(require("inquirer"));
var iam = new aws_sdk_1.default.IAM();
var _a = require('../package'), version = _a.version, name = _a.name;
inquirer_1.default.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));
console.info(name + "@" + version);
var s3 = new s3_1.default();
var bucketReg = /(?=^.{3,63}$)(?!^(\d+\.)+\d+$)(^(([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])\.)*([a-z0-9]|[a-z0-9][a-z0-9\-]*[a-z0-9])$)/;
function getBucketNames() {
    return __awaiter(this, void 0, void 0, function () {
        var Buckets;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, s3.listBuckets().promise()];
                case 1:
                    Buckets = (_a.sent()).Buckets;
                    return [2 /*return*/, (Buckets || []).map(function (b) { return b.Name; })];
            }
        });
    });
}
function createBucket(name) {
    return __awaiter(this, void 0, void 0, function () {
        var Bucket, bucketName, err_1, bucket, bucketName;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!name) return [3 /*break*/, 6];
                    return [4 /*yield*/, inquirer_1.default.prompt([{
                                type: 'input',
                                name: 'bucketName',
                                validate: function (name) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        if (!bucketReg.test(name)) {
                                            return [2 /*return*/, 'must be a valid bucket name -> https://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html'];
                                        }
                                        return [2 /*return*/, true];
                                    });
                                }); }
                            }])];
                case 1:
                    bucketName = (_a.sent()).bucketName;
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, s3.createBucket({
                            Bucket: bucketName
                        }).promise()];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    console.error(err_1.message);
                    bucketName = createBucket(name);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, bucketName];
                case 6:
                    if (!!bucketReg.test(name)) return [3 /*break*/, 8];
                    console.error('must be a valid bucket name -> https://docs.aws.amazon.com/AmazonS3/latest/dev/BucketRestrictions.html');
                    return [4 /*yield*/, createBucket()];
                case 7:
                    bucket = _a.sent();
                    return [2 /*return*/, bucket];
                case 8:
                    bucketName = name;
                    return [4 /*yield*/, s3.createBucket({
                            Bucket: name
                        }).promise()];
                case 9:
                    _a.sent();
                    return [2 /*return*/, bucketName];
            }
        });
    });
}
function makeBucketName(name) {
    return __awaiter(this, void 0, void 0, function () {
        var bucketName, useExisting, bucketName, bucketNames, bucketName;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(name != null)) return [3 /*break*/, 2];
                    return [4 /*yield*/, createBucket(name)];
                case 1:
                    bucketName = _a.sent();
                    return [2 /*return*/, bucketName];
                case 2: return [4 /*yield*/, inquirer_1.default.prompt([{
                            type: 'confirm',
                            message: 'Would you like choose an existing bucket? (no to create one)',
                            name: 'useExisting',
                        }])];
                case 3:
                    useExisting = (_a.sent()).useExisting;
                    if (!!useExisting) return [3 /*break*/, 5];
                    return [4 /*yield*/, createBucket()];
                case 4:
                    bucketName = _a.sent();
                    return [2 /*return*/, bucketName];
                case 5: return [4 /*yield*/, getBucketNames()];
                case 6:
                    bucketNames = _a.sent();
                    return [4 /*yield*/, inquirer_1.default.prompt([{
                                type: 'list',
                                name: 'bucketName',
                                description: 'Which bucket would you like to upload to',
                                choices: bucketNames
                            }])];
                case 7:
                    bucketName = (_a.sent()).bucketName;
                    return [2 /*return*/, bucketName];
            }
        });
    });
}
function makeDir(dirName) {
    return __awaiter(this, void 0, void 0, function () {
        var dir, stat, dir;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(dirName == null)) return [3 /*break*/, 2];
                    return [4 /*yield*/, inquirer_1.default.prompt([{
                                type: 'autocomplete',
                                name: 'dir',
                                message: 'Select a directory to watch',
                                source: function (answersSoFar, input) { return __awaiter(_this, void 0, void 0, function () {
                                    var _input, dirname, possibleMatches, dirs;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                _input = input || '.';
                                                dirname = path_1.default.dirname(_input.replace(/\/$/, '/.'));
                                                return [4 /*yield*/, fs_1.promises.readdir(dirname)];
                                            case 1:
                                                possibleMatches = _a.sent();
                                                dirs = possibleMatches
                                                    .filter(function (file) {
                                                    var name = path_1.default.relative(dirname, input || '');
                                                    return file.includes(name);
                                                });
                                                return [2 /*return*/, dirs];
                                        }
                                    });
                                }); }
                            }])];
                case 1:
                    dir = (_a.sent()).dir;
                    return [2 /*return*/, dir];
                case 2: return [4 /*yield*/, fs_1.promises.stat(dirName)];
                case 3:
                    stat = _a.sent();
                    if (!(!stat.isDirectory() && !stat.isFile())) return [3 /*break*/, 5];
                    console.error("Path " + dirName + " doesn't exist, please choose one which does or create one");
                    return [4 /*yield*/, makeDir()];
                case 4:
                    dir = _a.sent();
                    return [2 /*return*/, dir];
                case 5: return [2 /*return*/, dirName];
            }
        });
    });
}
function renderProgress(prog) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            console.clear();
            Object.keys(prog).forEach(function (key) {
                console.log(key + ": " + prog[key]);
            });
            return [2 /*return*/];
        });
    });
}
function watchAndSync(Bucket, dir) {
    return __awaiter(this, void 0, void 0, function () {
        var files;
        var _this = this;
        return __generator(this, function (_a) {
            console.clear();
            files = {};
            chokidar_1.default.watch(dir, { ignored: /\.DS_Store$/ }).on('add', function (path) { return __awaiter(_this, void 0, void 0, function () {
                var file, Key, upload;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            file = fs_1.createReadStream(path);
                            Key = path_1.default.relative(dir, path);
                            files[Key] = '0%';
                            renderProgress(files);
                            upload = new s3_1.default.ManagedUpload({
                                params: {
                                    Bucket: Bucket,
                                    Key: Key,
                                    Body: file,
                                },
                            });
                            upload.on('httpUploadProgress', function (prog) {
                                var percent = Math.round((prog.loaded / prog.total) * 100);
                                files[Key] = percent + "%";
                                renderProgress(files);
                            });
                            upload.send();
                            return [4 /*yield*/, upload.promise()
                                //console.log({ uploading: path })
                                //console.info({ uploaded: path })
                            ];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            }); }).on('unlink', function (path) { return __awaiter(_this, void 0, void 0, function () {
                var Key;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            Key = path_1.default.relative(dir, path);
                            return [4 /*yield*/, s3.deleteObject({
                                    Bucket: Bucket,
                                    Key: path
                                }).promise()];
                        case 1:
                            _a.sent();
                            files[Key] = "Removed";
                            renderProgress(files);
                            return [2 /*return*/];
                    }
                });
            }); });
            return [2 /*return*/];
        });
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var options, dirName, bucketName;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // const user = await iam.getUser().promise()
                    // console.log(user)
                    commander_1.program
                        .option('-d --dir <dir>')
                        .option('-b --bucket <bucket>')
                        .parse(process.argv);
                    options = commander_1.program.opts();
                    console.log(options.bucket);
                    return [4 /*yield*/, makeDir(options.dir)];
                case 1:
                    dirName = _a.sent();
                    return [4 /*yield*/, makeBucketName(options.bucket)];
                case 2:
                    bucketName = _a.sent();
                    watchAndSync(bucketName, dirName);
                    return [2 /*return*/];
            }
        });
    });
}
run();
