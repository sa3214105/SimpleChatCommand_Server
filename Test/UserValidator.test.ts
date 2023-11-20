import * as fs from "fs";
import {UserValidator_SQLite } from "../Src/UserValidator";
function RemoveDB(dbPath:string){
    if(fs.existsSync(dbPath)){
        fs.unlinkSync(dbPath);
    }
}
test("Basic Test",async()=>{
    let dbPath="./test.db";
    let userName="User1";
    let passwd="passwd";
    //remove old db
    RemoveDB(dbPath);
    let userManager:UserValidator_SQLite|null = new UserValidator_SQLite(dbPath);
    expect(await userManager.createUser(userName,passwd)).toBe(true);
    expect(await userManager.auth(userName,passwd)).toEqual({"ID": "User1", "Name": "User1"});
    userManager=null;
    RemoveDB(dbPath);
});
test("Duplicate User Creation",async()=>{
    let dbPath="./test3.db";
    let userName="User1";
    let passwd="passwd";
    //remove old db
    RemoveDB(dbPath);
    let userManager:UserValidator_SQLite|null=new UserValidator_SQLite(dbPath);
    expect(await userManager.createUser(userName,passwd)).toBe(true);
    expect(await userManager.createUser(userName,passwd)).toBe(false);
    expect(await userManager.auth(userName,passwd)).toEqual({"ID": "User1", "Name": "User1"});
    userManager=null;
    RemoveDB(dbPath);
});
test("CreateUser Thread Safe Test",async()=>{
    let dbPath="./test4.db";
    RemoveDB(dbPath);
    let userManager:UserValidator_SQLite|null =new UserValidator_SQLite(dbPath);
    await new Promise<void>((resolve,reject)=>{
        let counter=0;
        for(let i=0;i<10;++i){
            userManager?.createUser("userName","xxx")
            .then(()=>{
                ++counter
             })
            .catch(err=>reject(err));
        }
        let timer=setInterval(() => {
            if(counter==10){
                resolve();
                clearInterval(timer);
            }
        }, 10);
    });
    RemoveDB(dbPath);
});