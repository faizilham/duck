import { Expr } from "./ast/expr"
import { Stmt } from "./ast/stmt";

export class ASTPrinter implements Expr.Visitor<string>, Stmt.Visitor<string> {
    private currentBlock = 0;

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

    visitWhileStmt(stmt: Stmt.While): string {
        let condition = stmt.condition.accept(this);

        let result = `while (${condition}) `;
        result += stmt.body.accept(this);

        return result;
    }

    visitVarDeclStmt(stmt: Stmt.VarDecl): string {
        let result = `let ${stmt.name.lexeme}`;

        if (stmt.expr){
            result += " = " + stmt.expr.accept(this);
        }

        return result + ";";
    }

    // Expr.Visitor implementation

    visitBinaryExpr(expr: Expr.Binary): string {
        let left = expr.left.accept(this);
        let right = expr.right.accept(this);
        return `${left} ${expr.operator.lexeme} ${right}`;
    }

    visitGroupingExpr(expr: Expr.Grouping): string {
        return `(${expr.inner.accept(this)})`;
    }

    visitIndexingExpr(expr: Expr.Indexing): string {
        let collection = expr.collection.accept(this);
        let index = expr.index.accept(this);
        return `${collection}[${index}]`;        
    }

    visitLiteralExpr(expr: Expr.Literal): string {
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