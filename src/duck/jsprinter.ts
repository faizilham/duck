import { Expr } from "./ast/expr"
import { Stmt } from "./ast/stmt";
import { DuckType, Type } from "./types";

function structConstructorTemplate(name: string, parameters: [string,string][]) : string{

return `function struct$${name}(${parameters.map(([name, value]) => `${name}=${value}`).join(", ")}){
    ${parameters.map(([name]) => `this.${name}=${name};`).join("\n    ")}
}
`;

}

export class JSPrinter implements Expr.Visitor<string>, Stmt.Visitor<string> {
    private currentBlock = 0;
    public options = {
        arrayBoundChecking: false
    };

    public print (statements : Stmt[] ) : string {
        return statements.map(stmt => stmt.accept(this)).join("\n");
    }

    private tabulate(str : string) : string {
        let tab = "";

        for (let i = 0; i < this.currentBlock; i++){
            tab += '    ';
        }

        return tab + str;
    }

    // Stmt.Visitor implementation
    
    visitAssignmentStmt(stmt: Stmt.Assignment): string {
        let expr = stmt.expr.accept(this);
        return `${stmt.name.lexeme} = ${expr};`;
    }

    visitBlockStmt(stmt: Stmt.Block): string {
        
        let result = '{\n';
        this.currentBlock++;
        for (let statement of stmt.statements){
            result += this.tabulate(statement.accept(this) + "\n");
        }
        this.currentBlock--;
        result += this.tabulate("}");


        return result;
    }

    visitExpressionStmt(stmt: Stmt.Expression): string {
        return stmt.expr.accept(this) + ";";
    }

    visitIfStmt(stmt: Stmt.If): string {
        let condition = stmt.condition.accept(this);

        let result = `if (${condition}) `;
        result += stmt.thenBranch.accept(this);

        if (stmt.elseBranch){
            result += " else " + stmt.elseBranch.accept(this);
        }

        return result;
    }

    visitSetIndexStmt(stmt: Stmt.SetIndex): string {
        let collection = stmt.target.collection.accept(this);
        let index = stmt.target.index.accept(this);

        let expr = stmt.expr.accept(this);

        if (this.options.arrayBoundChecking){
            return `__set(${collection}, ${index}, ${expr});`;
        } else {
            return `${collection}[${index}] = ${expr};`;
        }
    }

    visitStructStmt(stmt: Stmt.Struct): string {
        // return `// struct ${stmt.name.lexeme} constructor`;

        let members = (<DuckType.Struct>stmt.type).members;
        let param : [string, string][] = [];
        
        Object.keys(members).forEach(key => {
            param.push([key, this.defaultVarTypeValue(members[key])]);
        });

        return structConstructorTemplate(stmt.name.lexeme, param);
    }

    visitWhileStmt(stmt: Stmt.While): string {
        let condition = stmt.condition.accept(this);

        let result = `while (${condition}) `;
        result += stmt.body.accept(this);

        return result;
    }

    visitVarDeclStmt(stmt: Stmt.VarDecl): string {
        let result = `let ${stmt.name.lexeme} = `;

        if (stmt.expr){
            result += stmt.expr.accept(this);
        } else {
            result += this.defaultVarTypeValue(stmt.type)
        }

        return result + ";";
    }

    defaultVarTypeValue (type? : DuckType) : string {
        switch(type && type.type){
            case Type.Bool:
                return "false";
            case Type.Number:
                return "0";
            case Type.String:
                return '""';
            case Type.List:
                return "[]";
            case Type.Struct:
                return `new struct$${(<DuckType.Struct> type).name}()`;
        }

        return "null";
    }

    // Expr.Visitor implementation

    visitBinaryExpr(expr: Expr.Binary): string {
        let left = expr.left.accept(this);
        let right = expr.right.accept(this);
        return `${left} ${expr.operator.lexeme} ${right}`;
    }

    visitCallExpr(expr: Expr.Call): string {
        let callee = expr.callee.accept(this);
        let parameters = expr.parameters.map( ([, e], i) => {
            if (e) return e.accept(this)
            return this.defaultVarTypeValue(expr.paramTypes[i]);
        });

        return `${callee}(${parameters.join(", ")})`;
    }

    visitGroupingExpr(expr: Expr.Grouping): string {
        return `(${expr.inner.accept(this)})`;
    }

    visitIndexingExpr(expr: Expr.Indexing): string {
        let collection = expr.collection.accept(this);
        let index = expr.index.accept(this);

        if (this.options.arrayBoundChecking){
            return `__get(${collection}, ${index})`;
        } else {
            return `${collection}[${index}]`;
        }
    }

    visitLiteralExpr(expr: Expr.Literal): string {
        if (DuckType.String.contains(expr.type))
            return `"${expr.value}"`;
        return `${expr.value}`;
    }

    visitListExpr(expr: Expr.List): string{
        let elements = expr.elements.map(e => e.accept(this)).join(", ");
        return `[${elements}]`;
    }

    visitUnaryExpr(expr: Expr.Unary): string {
        return `${expr.operator.lexeme}${expr.right.accept(this)}`
    }

    visitVariableExpr(expr: Expr.Variable): string {
        return expr.name.lexeme;
    }
}