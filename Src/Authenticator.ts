import { Mutex } from "async-mutex";
import crypto from "crypto";
import { CDBManager } from "./CDBManager";
import { IAuthenticator, User } from "./SimpleChatCommandServer";
export class Authenticator_SQLite implements IAuthenticator {
    static LAST_VER = 0.1;
    private DBManager: CDBManager;
    private Mutex: Mutex;
    private DBVer: number = 0;
    constructor(dbPath: string) {
        this.DBManager = new CDBManager(dbPath);
        this.Mutex = new Mutex();
        this.initDefaultTable();
    }
    private async initDefaultTable() {
        const release = await this.Mutex.acquire();
        if (await this.DBManager.IsTableExist("DB_INFO")) {
            let info = await this.DBManager.Get("SELECT VERSION FROM 'DB_INFO'");
            if (!info) throw "Failed to read database";
            this.DBVer = info["VERSION"];
        } else {
            let createSql = "CREATE TABLE 'DB_INFO'('VERSION' REAL)";
            let insertSql = "INSERT INTO 'DB_INFO' VALUES (?)";
            await this.DBManager.Run(createSql);
            await this.DBManager.Run(insertSql, Authenticator_SQLite.LAST_VER);
        }
        let tableSql = "CREATE TABLE IF NOT EXISTS 'USERINFO'('NAME' TEXT NOT NULL PRIMARY KEY,'PASSWORD' TEXT NOT NULL,'SALT' TEXT NOT NULL);";
        let indexSql = "CREATE INDEX IF NOT EXISTS 'USERINFO_INDEX' ON 'USERINFO'('NAME')";
        await this.DBManager.Run(tableSql);
        await this.DBManager.Run(indexSql);
        release();
    }
    private async isUserNameExist(userName: string) {
        let data = await this.DBManager.Get(`SELECT count("NAME") FROM USERINFO WHERE "NAME"=?`, userName);
        return data["count(\"NAME\")"] === 1;
    }
    private hashPassword(password: string, salt: string) {
        crypto.randomBytes(16).toString('hex');
        let ret = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString();
        return ret;
    }
    async createUser(userName: string, password: string): Promise<boolean> {
        const release = await this.Mutex.acquire();
        let ret = false;
        if (!(await this.isUserNameExist(userName))) {
            let salt = crypto.randomBytes(16).toString()
            let hashPassword = this.hashPassword(password, salt);
            await this.DBManager.Run(`INSERT INTO USERINFO ("NAME","PASSWORD","SALT") VALUES  (?,?,?);`, [userName, hashPassword, salt]);
            ret = true;
        }
        release();
        return ret;
    }
    async auth(userName: string, password: string): Promise<User | null> {
        let ret = null;
        const release = await this.Mutex.acquire();
        let data = await this.DBManager.Get(`SELECT "PASSWORD","SALT" FROM "USERINFO" WHERE "NAME"=?`, userName);
        if (data) {
            let passwordAfterHash = data["PASSWORD"];
            let salt = data["SALT"];
            if (this.hashPassword(password, salt) === passwordAfterHash) {
                ret = {
                    ID:userName,
                    Name:userName
                }
            }
        }
        release();
        return ret;
    }
}