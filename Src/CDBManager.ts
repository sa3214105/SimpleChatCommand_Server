import sqlite3, { Database, RunResult } from "sqlite3";
import { promisify } from "util";
//TODO DB connect pool;TODO change sqlite lib
export class CDBManager{
    #m_ConnStr="";
    static s_DBStructVer=0.1;
    #m_DB:Database|null=null;
    constructor(connectString:string){
        this.#m_ConnStr=connectString;
    }
    async Get(sql:string,...arg:any[]){
        this.#m_DB=new sqlite3.Database(this.#m_ConnStr);
        let ret =await this.#NodeExecuter(this.#m_DB.get,sql,...arg);
        await this.#NodeExecuter(this.#m_DB.close);
        return ret;
    }
    async Run(sql:string,...arg:any[]){
        this.#m_DB=new sqlite3.Database(this.#m_ConnStr);
        let ret=await this.#NodeExecuter(this.#m_DB.run,sql,...arg);
        await this.#NodeExecuter(this.#m_DB.close);
        return ret;
    }
    async All(sql:string,...arg:any[]){
        let allPromise=new Promise((resolve,reject)=>{
            let rows:any[]=[];
            let callBack=(err:Error|null,row:any)=>{
                if(err)return reject(err);
                rows.push(row);
            }
            let complete=(err:Error|null,count:any)=>{
                if(err)return reject(err);
                resolve({rows,count});
            }
            this.#m_DB?.each(sql,...arg,callBack,complete);
        });
        this.#m_DB=new sqlite3.Database(this.#m_ConnStr);
        let ret =await allPromise;
        await this.#NodeExecuter(this.#m_DB.close);
        return ret; 
    }
    async IsTableExist(tableName:string){
        let sql="SELECT count(*) FROM sqlite_master WHERE type='table' AND name =?"
        let tableCount=(await this.Get(sql,tableName))["count(*)"];
        return tableCount===1;
    }
    #NodeExecuter(func:(...args:any[])=>any,...args:any){
        return new Promise<any>((resolve: (arg0: any) => void,reject: (arg0: any) => void) =>{
            func.call(this.#m_DB,...args,(err:Error|null,...args:any[])=>{
                if(err){
                    reject(err);
                }else{
                    resolve(args.length>1?args:args[0]);
                };
            })
        });
    }

}