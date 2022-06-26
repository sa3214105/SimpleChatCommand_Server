import sqlite3 from "sqlite3";
export class CDBManager{
    #m_ConnStr="";
    #m_DB=null;
    static s_DBStructVer=0.1;
    constructor(connectString){
        this.#m_ConnStr=connectString;
        this.#m_DB=new sqlite3.Database(this.#m_ConnStr);
    }
    async Get(sql,param){
        return this.#NodeExcuter(this.#m_DB.get,sql,param);;
    }
    async Run(sql,param){
        return this.#NodeExcuter(this.#m_DB.run,sql,param);
    }
    async All(sql,param){
        return new Promise((resolve,reject)=>{
            let rows=[];
            let callBack=(err,row)=>{
                if(err)return reject(err);
                rows.push(row);
            }
            let complete=(err,count)=>{
                if(err)return reject(err);
                resolve({rows,count});
            }
            this.#m_DB.each(sql,param,callBack,complete);
        });
    }
    async IsTableExist(tableName){
        let sql="SELECT count(*) FROM sqlite_master WHERE type='table' AND name =?"
        let tableCount=(await this.Get(sql,tableName))["count(*)"];
        return tableCount===1;
    }
    #NodeExcuter(func,...args){
        return new Promise(function(resolve,reject){
            func.call(this.#m_DB,...args,(err,...args)=>{
                if(err){
                    reject(err);
                }else{
                    resolve(args.length>1?args:args[0]);
                };
            })
        }.bind(this))
    }

}