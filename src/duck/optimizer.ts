import {Expr} from "./ast/expr"
import {Stmt} from "./ast/stmt"
import {TokenType, Token} from "./token"
import { DuckType } from "./types";

export class Optimizer implements Expr.Visitor<Expr>, Stmt.Visitor<void> {

    public optimize(statements : Stmt[]){
        for (let statement of statements){
            try {
                statement.accept(this);
            } catch(e){}
        }
    }

    /** Statement Visitor */

    visitAssignmentStmt(stmt: Stmt.Assignment): void {
        stmt.expr = this.cleanGrouping(stmt.expr.accept(this));
    }

    visitBlockStmt(stmt: Stmt.Block): void {
        for (let statement of stmt.statements){
            statement.accept(this);
        }
    }

    visitExpressionStmt(stmt: Stmt.Expression): void {
        stmt.expr = this.cleanGrouping(stmt.expr.accept(this));
    }

    visitIfStmt(stmt: Stmt.If): void {
        stmt.condition = this.cleanGrouping(stmt.condition.accept(this));
        stmt.thenBranch.accept(this);

        if (stmt.elseBranch) stmt.elseBranch.accept(this);
    }

    visitWhileStmt(stmt: Stmt.While): void {
        stmt.condition = this.cleanGrouping(stmt.condition.accept(this));
        stmt.body.accept(this);
    }

    visitVarDeclStmt(stmt: Stmt.VarDecl): void {
        if (stmt.expr) {
            stmt.expr = this.cleanGrouping(stmt.expr.accept(this));
        }
    }

    cleanGrouping(expr : Expr) : Expr{
        if (expr instanceof Expr.Grouping){
            return expr.inner;
        }

        return expr;
    }
    /** Expression Visitor */

    visitBinaryExpr(expr: Expr.Binary): Expr {
        expr.left = expr.left.accept(this);
        expr.right = expr.right.accept(this);

        const left = expr.left, right = expr.right;

        if ((left instanceof Expr.Literal) && (right instanceof Expr.Literal)){
            switch (expr.operator.tokenType){
                case TokenType.PLUS:
                    return new Expr.Literal(left.value + right.value, left.type);

                case TokenType.MINUS:
                    return new Expr.Literal(left.value - right.value, left.type);
                
                case TokenType.STAR:
                    return new Expr.Literal(left.value * right.value, left.type);
            
                case TokenType.BANG_EQUAL:
                    return new Expr.Literal(left.value !== right.value, DuckType.Bool);
                    
                case TokenType.EQUAL_EQUAL:
                    return new Expr.Literal(left.value === right.value, DuckType.Bool);
   
                case TokenType.GREATER:
                    return new Expr.Literal(left.value > right.value, DuckType.Bool);
                    
                case TokenType.GREATER_EQUAL:
                    return new Expr.Literal(left.value >= right.value, DuckType.Bool);
                    
                case TokenType.LESS:
                    return new Expr.Literal(left.value < right.value, DuckType.Bool);
                
                case TokenType.LESS_EQUAL:
                    return new Expr.Literal(left.value <= right.value, DuckType.Bool);
            }
        }

        return expr;
    }

    visitGroupingExpr(expr: Expr.Grouping): Expr {
        expr.inner = expr.inner.accept(this);

        if (expr.inner instanceof Expr.Grouping){
            return expr.inner;
        } else if (expr.inner instanceof Expr.Literal){
            return expr.inner;
        }

        return expr;
    }

    visitIndexingExpr(expr: Expr.Indexing): Expr {
        expr.collection = expr.collection.accept(this);
        expr.index = expr.index.accept(this);

        return expr;
    }

    visitLiteralExpr(expr: Expr.Literal): Expr {
        return expr;
    }

    visitListExpr(expr: Expr.List): Expr {
        expr.elements = expr.elements.map(e => e.accept(this));

        return expr;
    }

    visitUnaryExpr(expr: Expr.Unary): Expr {
        expr.right = expr.right.accept(this);
        const right = expr.right;

        if (right instanceof Expr.Literal){
            switch(expr.operator.tokenType){
                case TokenType.MINUS:
                    right.value = -right.value;
                    return right;
                case TokenType.BANG:
                    right.value = !right.value;
                    return right;
            }
        }

        return expr;
    }

    visitVariableExpr(expr: Expr.Variable): Expr {
        return expr;
    }
}