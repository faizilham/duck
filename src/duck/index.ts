import * as fs from "fs";
import * as util from "util";
import {Lexer} from "./lexer";
import {Parser} from "./parser";
import {Reporter} from "./error";

const readFileAsync = util.promisify(fs.readFile);

export namespace Duck {
    export async function runFile(filename : string){
        const contents = await readFile(filename);

        run(contents);
    }

    async function readFile(filename : string): Promise<string>{
        try {
            return (await readFileAsync(filename)).toString();
        } catch(e) {
            console.error(`Error: File '${filename}' not found`);
            process.exit(1);
        }
    }

    function run(source : string){
        const lexer = new Lexer(source);

        let tokens = lexer.scan();

        if (Reporter.hasError){
            process.exit(1);
        }

        // for (let token of tokens){
        //     console.log(token.stringify());
        // }

        const parser = new Parser(tokens);
        try {

            let expr = parser.parseExpr();
            console.log(JSON.stringify(expr, null, 2));
        } catch(e) {
            console.error("Error", e);
        }
    }
}