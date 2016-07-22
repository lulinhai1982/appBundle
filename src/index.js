
var express = require('express');
var cp = require("child_process");
var bodyParser = require('body-parser');
var fs = require("fs");
var gm = require("gm");
var request = require('request');
var qiniuService = require("./libs/qiniuInterface");
var apkDao = require("./dao/apkInfo").getInstance();

var app = express();

app.use(bodyParser.urlencoded({ extended: false })); 

app.all('*', setHeader);
function setHeader(req, res, next) {
    /*
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers = DNT,X-Mx-ReqToken,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type, Accept-Language, Origin, Accept-Encoding");
    res.header("X-Powered-By", ' 3.2.1');
    */
    next();
}

app.get('/', function (req, res) {
    console.log("root get function"); 
    res.send('root function!' + __dirname);
});

app.get('/getFileUrl', function(req, res){
    var uid = req.query.uid;
    var appName = req.query.appName;
    var version = req.query.version;

    var key = qiniuService.GetDataKey(uid, appName, version); 
    var rlt = qiniuService.GetFileUrl(key);
    res.json({code:0, data:rlt});
});


app.get('/getAllHisVersion', function(req, res){
    var uid = req.query.uid;
    var appid = req.query.appid;
    var limit =   req.query.limit;
    var offset = req.query.offset;
    /*
    var uid = "roland";
    var appid = "applicationID";
    var limit = 10;
    var offset = 0;
*/
    if((uid===null)||(appid===null)|| (uid===undefined)||(appid===undefined) ){
        res.json({code:1, data: "parameter is null!!"});
    }
    if((limit===undefined)||(limit===0)){
        limit=10;
    }
    if(offset===undefined){
       offset = 0;
    }

    apkDao.get(uid, appid, limit, offset, function(err, reply){
        if(err == null){
            res.json({code:0, data:reply});
        }else{
            res.json({code:1, data:err}); 
        }
    });
});

app.get('/getLatestVersion', function(req, res){
    var uid = req.query.uid;
    var appid = req.query.appid;
 
    console.log(uid);
    console.log(appid);
    if((uid===null)||(appid===null)|| (uid===undefined)||(appid===undefined) ){
        res.json({code:1, data: "parameter is null!!"});
    }
   //test code
    //var uid = "roland";
    //var appid = "applicationID";

    apkDao.getLatestVersion(uid, appid, function(err, reply){
        if(err == null){
            res.json({code:0, data:reply});
        }else{
            res.json({code:1, data:err}); 
        }
    });
});


var toolsRootDir = "/data/apkBundle/tools";
var apkRootDir = "/data/apkBundle/apkData";
var templateName = "larktmpl";
var paraDefDir = "app-def";
var apkOutDir = "app-out";


app.post('/createApk', function(req, res){
            // following para should applied by the client app. 
            console.log(req);
            console.log("====================");

            var uid = req.body.uid;
            var appid = req.body.appid; 
            var appName = req.body.appName; 
            var version = req.body.version;//version string defined by user.
            var appUrl = req.body.appUrl;
            var pictUrl = req.body.pictUrl;//application icon url.
            var appIntroduce = req.body.intro;// application introduce.
            var developer = req.body.dever;// application developer.
            var orgnizer = req.body.org; // application creater organizer.
            /*
            var uid = "lulinhai";
            var appid = "56c6e09853602";
            var appName = "larkjd";
            var version = "1.0.0";//version string defined by user.
            var appUrl = "www.jd.com";
            var pictUrl = "www.larkapp.com/picturl";
            var appIntroduce = "applicationIntroduce"; 
            var developer = "application developer"; 
            var orgnizer = "application organizer"; 
*/
            getLatestVersion(uid, appid, function(verCode){
                console.log("vercode is"+ verCode);
                var packageName = appName + "_" + verCode;

                // get the apk directory.
                var apkDir = apkRootDir+ "/" + uid + "/" + appid + "_"+ verCode;

                cp.exec(" cd " + toolsRootDir + ";\n        mkdir -p " + apkDir + "/;\n        unzip -qo tools.data -d "  + apkDir + "/;\n   wait;", {
                    maxBuffer: 2 * 1024 * 1024
                }, function (err, stdout, stderr) {
                    if (err || stderr) {
                        console.error("/api/createApk/ err step 1", err, stdout, stderr);
                    }
                    else {
                        // build the manifest.xml
                        var manifestFilePath = apkDir +"/"+ paraDefDir + "/manifest.json";
                        buildManifestFile(manifestFilePath , packageName, verCode, version, appName, appUrl);

                        // get the qiniu cdn key
                        var key = qiniuService.GetDataKey(uid, packageName, version, verCode);

                        //build the apk
                        console.log("the key is -------------"+key);
                       var saveDBPara = {uid:uid, appid:appid, appName:appName, version:version, appUrl:appUrl, key:key,pictUrl:pictUrl, appIntro:appIntroduce, dever:developer, org: orgnizer, res:res};
                        buildApk(apkDir, templateName, paraDefDir, appName, apkOutDir, key, saveDBPara, insertApp2DB);
                    }
                });

            });
        }
);

function getLatestVersion(uid, appid, cb){
    var verCode;

    console.log("function getLatestVersion ======");
    apkDao.getLatestVersion(uid, appid, function(err, reply){
        if(reply.length === 0){
            verCode = 1; 
            cb(verCode);
        }else{
            verCode = reply[0].autoIncVerCode+1;
            cb(verCode);
        }
    });
}

function buildApk(toolDir, apkTemplateName, paraDefDir, desApkName, apkOutDir, key, saveDBPara, cb){

    console.log("function buildApk============");
    var paraDefPath = toolDir + "/" + paraDefDir;
    var apkOutPath = toolDir + "/" + apkOutDir;
    cp.exec(" cd " + toolDir + ";\n ./androidapkbuild.sh" + " "+ toolDir + " " + apkTemplateName +" "+ paraDefPath + " "  + desApkName + " "+ apkOutPath +";\n        wait;", {
        maxBuffer: 2 * 1024 * 1024
    }, function (err, stdout, stderr) {
        if(err){
            console.log("==============function buildApk  err======================");
            console.log(err);
            console.log(stdout);
            console.log(stderr);
        }else{
            var outApkPath = toolDir + '/' + apkOutDir + "/" + desApkName+".apk";
            fs.exists(outApkPath, function(exists){
                if(exists){
                    qiniuService.selfUploadFile(key, outApkPath,saveDBPara, cb);
                }else{
                    console.log("no file exists"); 
                }
            });
        }
    });

}



function buildManifestFile(filePath, packageName, verCode, version, appName, appUrl){
    console.log("function buildManifestFile============");
    fs.readFile(filePath, 'utf8', function (err, data) {
        if (err) {
            return err;
        }

        data = data.split('PACK_NAME_FLAG').join(packageName);
        data = data.split('VERSION_CODE_FLAG').join(verCode);
        data = data.split('VERSION_NAME_FLAG').join(version);
        data = data.split('APP_NAME_FLAG').join(appName);
        data = data.split('URL_FLAG').join(appUrl);
        fs.writeFile(filePath, data, function (err) {
            if (err) {
                return err;
            }
        });
    });
}


function uploadFileToQiniuCDN(uid, appName, version, filePath){
    console.log("function uploadFileToQiniuCDN============");
    var key = qiniuService.GetDataKey(uid, appName, version);
    var rlt = qiniuService.selfUploadFile(key, filePath);
    return rlt; 
}


var port = process.env.PORT|| 4000;
var server = app.listen(port, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('larkapkserver app listening at http://%s:%s', host, port);
});


function insertApp2DB(saveDBPara){
    console.log("function insertApp2DB============");
    var key = saveDBPara.key;
    var uid = saveDBPara.uid;
    var appid = saveDBPara.appid;
    var appName = saveDBPara.appName;
    var version = saveDBPara.version;
    var appUrl = saveDBPara.appUrl;
    var pictUrl = saveDBPara.pictUrl;
    var appIntro = saveDBPara.appIntro;
    var developer = saveDBPara.dever;
    var res = saveDBPara.res;
    var org = saveDBPara.org;

    var appBundleUrl = qiniuService.GetFileUrl(key);

    apkDao.getLatestVersion(uid, appid, function(err, reply){
        var verCode;
        if(reply.length === 0){
            verCode = 1; 
        }else{
            verCode = reply[0].autoIncVerCode+1;
        }
        apkDao.save(uid, appid, appName, verCode, version, appUrl,pictUrl, appIntro, developer, org,  appBundleUrl);
        res.json({code:0, data:appBundleUrl});
    });

}


// test code
app.get('/insertVer2DB', function(req,res){
    var uid = "roland";
    var appid = "applicationID";
    var appName = "applicationName";
    var version = "applicationVersion";
    var appUrl = "applicationURL";
    var appBundelUrl = "applictionBundleURL";

    apkDao.getLatestVersion(uid, appid, function(err, reply){
        var verCode;
        if(reply.length === 0){
            console.log("step 111");
            verCode = 1; 
        }else{
            console.log("step 222");
            verCode = reply[0].autoIncVerCode+1;
        }
        console.log("curr version code is "+ verCode);
        apkDao.save(uid, appid, appName, verCode, version, appUrl, appBundelUrl);
    });
    res.json({code:0, data:"OK"}); 
});
/*
app.get('/testDownFile', function(req, res){
    var fileUrl = "http://imgst-dl.meilishuo.net/pic/_o/84/a4/a30be77c4ca62cd87156da202faf_1440_900.jpg";
    var localFilePath = "/data/gougou.jpg";
    var localRszFilePath200 = "/data/gougou200.jpg";
    var localRszFilePath100 = "/data/gougou100.jpg";

    //request(fileUrl).pipe(fs.createWriteStream(localFilePath));


    console.log("function testDownFile step1");
    gm(localFilePath).resize(200, 200).noProfile().write(localRszFilePath200, function (err) {
          if (!err) console.log('done');
    });

    console.log("function testDownFile step2");
    gm(localFilePath).resize(100, 100).noProfile().write(localRszFilePath100, function (err) {
          if (!err) console.log('done');
    });
     res.json({code:0, data:"download success"});
});
*/
