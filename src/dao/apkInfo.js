var db = require("../libs/mysql");
var moment = require("moment");
var mysql = require("mysql");

exports.getInstance = function () {
    return new ApkInfo();
};

var ApkInfo = function () {
};

ApkInfo.prototype.save = function (uid, appid, appName, verCode, version, appUrl,  pictUrl, appIntro, developer, org, appBundleUrl) {
    var ctime = moment().format('YYYY-MM-DD HH:mm:ss');

    // insert code info to DB.
    var setData = {
        uid: uid, appid: appid, app_name: appName, version: version,  autoIncVerCode:verCode, appUrl:appUrl, pictUrl:pictUrl, appIntro:appIntro, developer:developer, organizer:org, appBundleUrl:appBundleUrl,  ctime: ctime
    };
    var sql = db.insertStr("apk_info", setData);
    db.query(sql, function(err, rows){
        if(err != null){
            console.log("ApkInfo insert data error " + err + rows)
        }
    });
};

ApkInfo.prototype.get = function (uid, appid, limit, offset,  cb) {
    console.log("function  ApkInfo.prototype.get========== ");

    var sql = db.selectStr('apk_info', { uid: uid });
    sql += " AND `appid` = '" + appid + "'" + " order by autoIncVerCode desc limit "+limit+" offset "+offset;
    console.log(sql);
    db.query(sql, function (err, reply) {
        console.log("Dao rlt-------"+JSON.stringify(reply));
        // get the totalnum
        var totalNumSql = "select count(id) as account from apk_info where `uid`='"+uid+"' and  `appid`='"+appid+"'";
        console.log(totalNumSql);
        db.query(totalNumSql, function(err,numReply){
            cb(err, {totalNum: numReply, tableData: reply});
        })

    });
};

ApkInfo.prototype.getLatestVersion = function (uid, appid,  cb) {
    console.log("function  ApkInfo.prototype.getLatestVersion========== ");
    var sql = db.selectStr('apk_info', { uid: uid });
    sql += " AND `appid` = '" + appid + "'" + " order by autoIncVerCode desc limit 1";
    db.query(sql, function (err, reply) {
        console.log("Dao rlt-------"+JSON.stringify(reply));
        cb(err, reply);
    });
};
