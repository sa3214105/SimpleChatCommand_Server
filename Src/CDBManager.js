import sqlite3 from "sqlite3";
export class CDBManager{
    #m_ConnStr="";
    static s_DBStructVer=0.1;
    #m_DB=null;
    constructor(connectString){
        this.#m_ConnStr=connectString;
    }
    async Get(sql,param){
        this.#m_DB=new sqlite3.Database(this.#m_ConnStr);
        let ret =await this.#NodeExcuter(this.#m_DB.get,sql,param);
        await this.#NodeExcuter(this.#m_DB.close);
        return ret;
    }
    async Run(sql,param){
        this.#m_DB=new sqlite3.Database(this.#m_ConnStr);
        let ret=await this.#NodeExcuter(this.#m_DB.run,sql,param);
        await this.#NodeExcuter(this.#m_DB.close);
        return ret;
    }
    async All(sql,param){
        let allPromise=new Promise((resolve,reject)=>{
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
        this.#m_DB=new sqlite3.Database(this.#m_ConnStr);
        let ret =await allPromise;
        await this.#NodeExcuter(this.#m_DB.close);
        return ret; 
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