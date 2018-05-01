import {Duck} from "./duck";

if (process.argv.length <= 2){
    console.log("Usage: duck filename");
} else {
    Duck.runFile(process.argv[2]);
}