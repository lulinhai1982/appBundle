var request = require('request');
var fs = require('fs');
var qiniu = require("qiniu");

function uptoken(bucket, key) {
    var putPolicy = new qiniu.rs.PutPolicy(bucket + ":" + key);
    return putPolicy.token();
}
function uploadFile(bucket, key, localFile,saveDBPara,  cb) {
    var uploadToken = uptoken(bucket, key);
    var extra = new qiniu.io.PutExtra();
    qiniu.io.putFile(uploadToken, key, localFile, extra, function (err, ret) {
        if (!err) {
            console.log("uploadFile sucess", ret.hash, ret.key, ret.persistentId);
            cb(saveDBPara );
        }
        else {
            console.log("uploadFile fail", err);
        }
    });
}

var qiniuRootUrl = 'http://7xwhxl.com2.z0.glb.qiniucdn.com/';
qiniu.conf.ACCESS_KEY = 'fCfviGmSeyM0qMDVSb3Doc-t6HRUiV000SjtoMbL';
qiniu.conf.SECRET_KEY = 'XiWtfRDJHVid8DNrSgF5MPa4vhL2aPZTbalQQDkd';
var selfbucket = 'apkbundle';

function GetDownloadUrl(key) {
    var wholeUrl = qiniuRootUrl + key;
    var policy = new qiniu.rs.GetPolicy(0);
    var callUrl = policy.makeRequest(wholeUrl);
    return callUrl;
}
function GetRemoteFile(url, filepath) {
    console.log(url);
    request(url, function (error, response, body) {
        if (error || response.statusCode != 200) {
            console.log("lark Qiniu module get remote file error");
        }
        else {
            console.log("QiniuModule GetRemoteFile get url OK!  ");
        }
    });
    console.log(">>>qiniu GetRemoteFile, url: %j", url);
    console.log(" filepath: %j", filepath);
    request(url).pipe(fs.createWriteStream(filepath));
}
function GetCloudFile(key, fileDestPath) {
    console.log("function GetCloudFile");
    var url = GetDownloadUrl(key);
    GetRemoteFile(url, fileDestPath);
}
exports.GetCloudFile = GetCloudFile;

function GetFileUrl(key) {
    console.log("function GetFileUrl");
    var url = GetDownloadUrl(key);
    return url;
}
exports.GetFileUrl= GetFileUrl;


function selfUploadFile(key, filepath,saveDBPara, cb) {
    console.log("function selfUploadFile"+"key is:"+key+"filepath is:"+filepath);
    uploadFile(selfbucket, key, filepath,saveDBPara, cb);
}
exports.selfUploadFile = selfUploadFile;

function GetDataKey(uid, appName, version, verCode) {
    console.log("function GetDataKey");
    var qiniuAppKey = uid + '/' + verCode + '/'+ appName + '_' + version + '.apk';
    return qiniuAppKey;
}
exports.GetDataKey = GetDataKey;

function GetDataThroughIDAndPath(uid, appName, version, fileDestPath) {
    console.log("function GetDataThroughIDAndPath");
    var key = GetDataKey(uid, appName, version);
    GetCloudFile(key, fileDestPath);
}
exports.GetDataThroughIDAndPath = GetDataThroughIDAndPath;
