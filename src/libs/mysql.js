var mysql = require("mysql");
var mysqlurl = "mysql://lark_dev:uz}uurAzsOj22tv@localhost/lark_bundle_dev?debug=false&charset=utf8";
var pool = mysql.createPool(mysqlurl);

function query(sql, processRow) {
    pool.getConnection(function (err, connection) {
        if (err) {
            console.error("getConnection error:", err.message);
            return processRow && processRow(err, null);
        }
        connection.query(sql, function (err, rows) {
            connection.release();
            if (err) {
                console.error("query error:", sql, err.message);
            }
            if ((typeof processRow) == 'function') {
                processRow(err, rows);
            }
        });
    });
}
function select(table, where, fields) {
    if (fields === void 0) { fields = '*'; }
    var sql = '';
    if (typeof fields == 'array') {
        sql = mysql.format("SELECT ? FROM ?? WHERE ? ", [fields, table, where]);
    }
    else {
        sql = mysql.format("SELECT " + fields + " FROM ?? WHERE ? ", [table, where]);
    }
    return sql;
}

function insert(table, setObj) {
    return mysql.format("INSERT  INTO ?? SET ? ", [table, setObj]);
}

function update(table, setObj, whereObj) {
    return mysql.format("UPDATE ?? SET ? WHERE ? ", [table, setObj, whereObj]);
}

function formatWhere(whereobj) {
}

module.exports = {
    query: query,
    selectStr: select,
    insertStr: insert,
    updateStr: update
};
