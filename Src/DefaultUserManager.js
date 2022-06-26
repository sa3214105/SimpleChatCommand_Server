import { Mutex } from "async-mutex";
import crypto from "crypto";
import { CDBManager } from "./CDBManager.js";
import { IUserManager } from "./CWebSocketController.js";
export class CUserManager extends IUserManager{
    static s_Instance=null;
    static s_Mutex=new Mutex();
    #m_Users=new Map();
    m_Path="./Users.json";
    m_Salt="test";
    constructor(){
        super();
        if(CUserManager.s_Instance==null){
            CUserManager.s_Instance=this;
            this.#GetUsers();
        }else{
            throw "Singleton class can not be new"
        }
    }
    static async GetInstance(){
        await CUserManager.s_Mutex.runExclusive(async ()=>{
            if(CUserManager.s_Instance===null){
                CUserManager.s_Instance=new CUserManager();
            }
        })
        return CUserManager.s_Instance;
    }
    async CreateUser(userName,password){
        let ret=false;
        if(!this.#m_Users.has(userName)){
            ret=true;
            this.#m_Users.set(userName,this.#HashPassword(password))
            this.#Update();
        }
        return ret;
    }
    async Auth(userName,password){
        //TODO stringCheck
        return this.#VerifyPassword(userName,password);
    }
    #Update(){
        let data=JSON.stringify(Object.fromEntries(this.#m_Users));
        fs.writeFileSync(this.m_Path,data,"utf-8");
        this.#GetUsers();
    }
    #GetUsers(){
        let dataStr=fs.readFileSync(this.m_Path,"utf-8");
        let datas=JSON.parse(dataStr);
        this.#m_Users.clear();
        for(let [key,value] of Object.entries(datas)){
            this.#m_Users.set(key,value);
        }
    }
    #HashPassword(password){
        crypto.randomBytes(16).toString('hex');
        let ret=crypto.pbkdf2Sync(password,this.m_Salt,1000,64,"sha512").toString();
        return ret;
    }
    #VerifyPassword(userName,password){
        return this.#HashPassword(password)===this.#m_Users.get(userName);
    }
}
export class CUserManagerDB extends IUserManager{
    static #LAST_VER=0.1;
    #m_Users=new Map();
    #m_DBVer=0;
    #m_DBManager=null;
    #IsInit=false;
    constructor(dbPath){
        super();
        this.#m_DBManager=new CDBManager(dbPath);
        this.#Init();
    }
    async #Init(){
        if(await this.#m_DBManager.IsTableExist("DB_INFO")){
            let info = await this.#m_DBManager.Get("SELECT VERSION FROM 'DB_INFO'");
            if(!info)throw "Failed to read database";
            this.m_DBVer=info["VERSION"];
        }else{
            let createSql="CREATE TABLE 'DB_INFO'('VERSION' REAL)";
            let insertSql="INSERT INTO 'DB_INFO' VALUES (?)";
            await this.#m_DBManager.Run(createSql);
            await this.#m_DBManager.Run(insertSql,CUserManagerDB.#LAST_VER);
        }
        let tableSql="CREATE TABLE IF NOT EXISTS 'USERINFO'('NAME' TEXT NOT NULL PRIMARY KEY,'PASSWORD' TEXT NOT NULL,'SALT' TEXT NOT NULL);";
        let indexSql="CREATE INDEX IF NOT EXISTS 'USERINFO_INDEX' ON 'USERINFO'('NAME')";
        await this.#m_DBManager.Run(tableSql);
        await this.#m_DBManager.Run(indexSql);
        this.#IsInit=true;
    }
    async #WaitInit(){
        return new Promise((resolve,reject)=>{
            let timeCounter=0;
            let timeOut=10000;//10sec;
            let callback=()=>{
                if(this.#IsInit){
                    resolve()
                }else{
                    if(timeCounter++<timeOut){
                        setTimeout(callback,1);
                    }else{
                        reject("time out");
                    }
                }
            };
            callback();
        });
    }
    async CreateUser(userName,password){
        await this.#WaitInit();
        let ret=false;
        if(this.#IsUserNameExist(userName)){
            let salt=Math.random().toString()
            let hashpwd=this.#HashPassword(password,salt);
            await this.#m_DBManager.Run(`INSERT INTO USERINFO ("NAME","PASSWORD","SALT") VALUES  (?,?,?);`,[userName,hashpwd,salt]);
            ret=true;
        }
        return ret;
    }
    async Auth(userName,password){
        await this.#WaitInit();
        return this.#VerifyPassword(userName,password);
    }
    async #IsUserNameExist(userName){
        let data=this.#m_DBManager.Get(`SELECT count("NAME") FROM USERINFO WHERE "NAME"=?`,userName);
        return  data["count('NAME')"] === 1;
    }
    #HashPassword(password,salt){
        crypto.randomBytes(16).toString('hex');
        let ret=crypto.pbkdf2Sync(password,salt,1000,64,"sha512").toString();
        return ret;
    }
    async #VerifyPassword(userName,password){
        let ret=false;
        let data =await this.#m_DBManager.Get(`SELECT "PASSWORD","SALT" FROM "USERINFO" WHERE "NAME"=?`,userName);
        if(data){
            let passwordDB=data["PASSWORD"];
            let salt=data["SALT"];
            ret=this.#HashPassword(password,salt)===passwordDB;
        }
        return ret;
    }
}