import { Expr } from "./ast/expr"
import { Stmt } from "./ast/stmt";
import { DuckType, Type } from "./types";

const STRUCT_PREFIX = "struct$";

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

    visitFuncStmt(stmt: Stmt.Func): string {
        let result = `function ${stmt.name.lexeme}(${stmt.parameters.map(x => x[0].lexeme).join(", ")}){\n`;

        this.currentBlock++;
        for (let statement of stmt.body){
            result += this.tabulate(statement.accept(this) + "\n");
        }
        this.currentBlock--;
        result += this.tabulate("}\n");

        return result;
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

    visitReturnStmt(stmt: Stmt.Return): string {
        if (stmt.expr){
            return `return ${stmt.expr.accept(this)};`;
        } else {
            return "return;";
        }
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

    visitSetMemberStmt(stmt: Stmt.SetMember): string {
        let collection = stmt.target.object.accept(this);
        let member = stmt.target.member.lexeme;

        let expr = stmt.expr.accept(this);

        return `${collection}.${member} = ${expr};`;
    }

    visitStructStmt(stmt: Stmt.Struct): string {
        // return `// struct ${stmt.name.lexeme} constructor`;

        let members = (<DuckType.Struct>stmt.type).members;
        let parameters : [string, string][] = [];
        
        members.keys().forEach(key => {
            parameters.push([key, members.get(key).defaultValue().accept(this)]);
        });

        const name = stmt.name.lexeme;

        let result = `function ${name}(${parameters.map(([name]) => name).join(", ")}){\n`;

        this.currentBlock++;
        for (let [name, value] of parameters){
            result += this.tabulate(`this.${name} = ${name} || ${value};\n`);
        }
        this.currentBlock--;
        result += this.tabulate("}\n");

        return result;
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
        }

        return result + ";";
    }

    // Expr.Visitor implementation

    visitBinaryExpr(expr: Expr.Binary): string {
        let left = expr.left.accept(this);
        let right = expr.right.accept(this);
        return `${left} ${expr.operator.lexeme} ${right}`;
    }

    visitCallExpr(expr: Expr.Call): string {
        let callee = expr.callee.accept(this);
        let parameters = expr.parameters.map( ([, e]) => e.accept(this));

        if (expr.type instanceof DuckType.Struct){
            callee = `new ${callee}`;
        }

        return `${callee}(${parameters.join(", ")})`;
    }

    visitGroupingExpr(expr: Expr.Grouping): string {
        return `(${expr.inner.accept(this)})`;
    }

    visitGetMemberExpr(expr: Expr.GetMember): string {
        let object = expr.object.accept(this);

        return `${object}.${expr.member.lexeme}`;
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