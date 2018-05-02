import {Expr} from "./ast/expr"
import {Stmt} from "./ast/stmt"
import {TokenType, Token} from "./token"
import { DuckType } from "./types";

export class Optimizer implements Expr.Visitor<Expr>, Stmt.Visitor<Stmt | undefined> {

    public optimize(statements : Stmt[]) : Stmt[]{
        let optimized : Stmt[] = [];

        for (let statement of statements){
            try {
                let opt = statement.accept(this);
                if (opt) optimized.push(opt);
            } catch(e){}
        }

        return optimized;
    }

    /** Statement Visitor */

    visitAssignmentStmt(stmt: Stmt.Assignment): Stmt | undefined {
        stmt.expr = this.cleanGrouping(stmt.expr.accept(this));
        return stmt;
    }

    visitBlockStmt(stmt: Stmt.Block): Stmt | undefined {
        let optimized : Stmt[] = [];

        for (let statement of stmt.statements){
            let opt = statement.accept(this);
            if (opt) optimized.push(opt);
        }

        if (optimized.length === 0){ // remove empty block
            return;
        } else if (optimized.length === 1 && optimized[0] instanceof Stmt.Block){ 
            // unbox block inside block without any other statement
            return optimized[0];
        }

        stmt.statements = optimized;

        return stmt;
    }

    visitExpressionStmt(stmt: Stmt.Expression): Stmt | undefined {
        stmt.expr = this.cleanGrouping(stmt.expr.accept(this));
        return stmt;
    }

    visitIfStmt(stmt: Stmt.If): Stmt | undefined {
        stmt.condition = this.cleanGrouping(stmt.condition.accept(this));

        // return the right branch if condition is literal false or true
        if ((stmt.condition instanceof Expr.Literal)){
            if (stmt.condition.value === false){
                if (!stmt.elseBranch) return;
                return stmt.elseBranch.accept(this);
            } else if (stmt.condition.value === true){
                return stmt.thenBranch.accept(this);
            }
        }

        stmt.thenBranch.accept(this);

        if (stmt.elseBranch) {
            stmt.elseBranch = stmt.elseBranch.accept(this); // remove else if empty / not other if
        }

        return stmt;
    }

    visitWhileStmt(stmt: Stmt.While): Stmt | undefined {
        stmt.condition = this.cleanGrouping(stmt.condition.accept(this));

        // remove loop if literal false
        if ((stmt.condition instanceof Expr.Literal) && stmt.condition.value === false){
            return;
        }

        stmt.body.accept(this);

        return stmt;
    }

    visitVarDeclStmt(stmt: Stmt.VarDecl): Stmt | undefined {
        if (stmt.expr) {
            stmt.expr = this.cleanGrouping(stmt.expr.accept(this));
        }

        return stmt;
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