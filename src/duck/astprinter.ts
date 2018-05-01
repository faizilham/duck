import { Expr } from "./ast/expr"

export class ASTPrinter extends Expr.Visitor<string> {
    public print (expr: Expr) : string {
        return expr.accept(this);
    }

    visitBinaryExpr(expr: Expr.Binary): string {
        let left = expr.left.accept(this);
        let right = expr.right.accept(this);
        return `(${expr.operator.lexeme} ${left} ${right})`;
    }

    visitGroupingExpr(expr: Expr.Grouping): string {
        return `(${expr.inner.accept(this)})`;
    }

    visitLiteralExpr(expr: Expr.Literal): string {
        return `${expr.value}`;
    }

    visitUnaryExpr(expr: Expr.Unary): string {
        return `(${expr.operator.lexeme} ${expr.right.accept(this)})`
    }

    visitVariableExpr(expr: Expr.Variable): string {
        return expr.name.lexeme;
    }
}