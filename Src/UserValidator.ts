import { Mutex } from "async-mutex";
import crypto from "crypto";
import { CDBManager } from "./CDBManager";
import { IAuthenticator, User } from "./SimpleChatCommandServer"

export class UserValidator_SQLite implements IAuthenticator {
    static #LAST_VER = 0.1;
    #m_Users = new Map();
    #m_DBVer = 0;
    #m_DBManager: CDBManager;
    #IsInit = false;
    #m_Mutex = new Mutex();
    constructor(dbPath: string) {
        this.#m_DBManager = new CDBManager(dbPath);
        this.#Init();
    }
    async createUser(userName: string, password: string): Promise<boolean> {
        await this.#WaitInit();
        const release = await this.#m_Mutex.acquire();
        let ret = false;
        if (!(await this.#IsUserNameExist(userName))) {
            let salt = Math.random().toString()
            let hashpwd = this.#HashPassword(password, salt);
            await this.#m_DBManager.Run(`INSERT INTO USERINFO ("NAME","PASSWORD","SALT") VALUES  (?,?,?);`, [userName, hashpwd, salt]);
            ret = true;
        }
        release();
        return ret;
    }
    async auth(userName: string, password: string): Promise<User | null> {
        await this.#WaitInit();
        if (await this.#VerifyPassword(userName, password)) {
            return { ID: userName, Name: userName };
        }
        return null;
    }
    async #Init() {
        if (await this.#m_DBManager.IsTableExist("DB_INFO")) {
            let info = await this.#m_DBManager.Get("SELECT VERSION FROM 'DB_INFO'");
            if (!info) throw "Failed to read database";
            this.#m_DBVer = info["VERSION"];
        } else {
            let createSql = "CREATE TABLE 'DB_INFO'('VERSION' REAL)";
            let insertSql = "INSERT INTO 'DB_INFO' VALUES (?)";
            await this.#m_DBManager.Run(createSql);
            await this.#m_DBManager.Run(insertSql, UserValidator_SQLite.#LAST_VER);
        }
        let tableSql = "CREATE TABLE IF NOT EXISTS 'USERINFO'('NAME' TEXT NOT NULL PRIMARY KEY,'PASSWORD' TEXT NOT NULL,'SALT' TEXT NOT NULL);";
        let indexSql = "CREATE INDEX IF NOT EXISTS 'USERINFO_INDEX' ON 'USERINFO'('NAME')";
        await this.#m_DBManager.Run(tableSql);
        await this.#m_DBManager.Run(indexSql);
        this.#IsInit = true;
    }
    async #WaitInit() {
        return await new Promise<void>((resolve, reject) => {
            let timeCounter = 0;
            let timeOut = 10000;//10sec;
            let callback = () => {
                if (this.#IsInit) {
                    resolve()
                } else {
                    if (timeCounter++ < timeOut) {
                        setTimeout(callback, 1);
                    } else {
                        reject("time out");
                    }
                }
            };
            callback();
        });
    }
    async #IsUserNameExist(userName: string) {
        let data = await this.#m_DBManager.Get(`SELECT count("NAME") FROM USERINFO WHERE "NAME"=?`, userName);
        return data["count(\"NAME\")"] === 1;
    }
    #HashPassword(password: string, salt: string) {
        crypto.randomBytes(16).toString('hex');
        let ret = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString();
        return ret;
    }
    async #VerifyPassword(userName: string, password: string) {
        let ret = false;
        let data = await this.#m_DBManager.Get(`SELECT "PASSWORD","SALT" FROM "USERINFO" WHERE "NAME"=?`, userName);
        if (data) {
            let passwordDB = data["PASSWORD"];
            let salt = data["SALT"];
            ret = this.#HashPassword(password, salt) === passwordDB;
        }
        return ret;
    }
}