/**
 * Optimizer optimize and minimize AST tree structure
 */

import {Expr} from "./ast/expr"
import {Stmt} from "./ast/stmt"
import {TokenType, Token} from "./token"
import { DuckType } from "./types";

function isInt(x : any) : boolean{
    return (~~x) === x;
}

export class Optimizer implements Expr.Visitor<Expr>, Stmt.Visitor<Stmt | undefined> {

    public optimize(statements : Stmt[]) : Stmt[]{
        return this.filterEmpty(statements);
    }

    /** Statement Visitor */

    visitAssignmentStmt(stmt: Stmt.Assignment): Stmt | undefined {
        stmt.expr = this.cleanGrouping(stmt.expr.accept(this));
        return stmt;
    }

    visitBlockStmt(stmt: Stmt.Block): Stmt | undefined {
        let optimized = this.filterEmpty(stmt.statements);

        if (optimized.length === 0){ // remove empty block
            return;
        }

        stmt.statements = optimized;

        return stmt;
    }

    filterEmpty(statements : Stmt[]) : Stmt[] {
        let optimized : Stmt[] = [];

        for (let statement of statements){
            let opt = statement.accept(this);

            // Filter out all removed statement
            if (!opt) continue;

            // Unbox block if it has no local variable declaration           
            if (opt instanceof Stmt.Block && opt.localVars === 0){
                for (let stmt of opt.statements){
                    optimized.push(stmt);
                }
                continue;
            }

            optimized.push(opt);
        }

        return optimized;
    }

    visitExpressionStmt(stmt: Stmt.Expression): Stmt | undefined {
        stmt.expr = this.cleanGrouping(stmt.expr.accept(this));
        return stmt;
    }

    visitIfStmt(stmt: Stmt.If): Stmt | undefined {
        stmt.condition = this.cleanGrouping(stmt.condition.accept(this));

        // Return the right branch if condition is literal false or true
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
            stmt.elseBranch = stmt.elseBranch.accept(this); // will remove else if empty / removed
        }

        return stmt;
    }

    visitSetIndexStmt(stmt: Stmt.SetIndex): Stmt | undefined {
        stmt.target = <Expr.Indexing>stmt.target.accept(this);
        stmt.expr = this.cleanGrouping(stmt.expr.accept(this));
        return stmt;
    }

    visitStructStmt(stmt: Stmt.Struct): Stmt | undefined {
        return stmt;
    }

    visitWhileStmt(stmt: Stmt.While): Stmt | undefined {
        stmt.condition = this.cleanGrouping(stmt.condition.accept(this));

        // Remove loop statement if condition is literal false
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

    // Unbox grouping (used in visit statements only)
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

        // Evaluate literal, except if left & right is float (to prevent rounding error at translation)
        if ((left instanceof Expr.Literal) && (right instanceof Expr.Literal)){
            switch (expr.operator.tokenType){
                case TokenType.PLUS:
                    if (DuckType.String.contains(left.type) || isInt(left.value) || isInt(right.value))
                        return new Expr.Literal(left.value + right.value, left.type);
                    break;

                case TokenType.MINUS:
                    if (isInt(left.value) || isInt(right.value))        
                        return new Expr.Literal(left.value - right.value, left.type);
                    break;
                    
                case TokenType.STAR:
                    if (isInt(left.value) || isInt(right.value))            
                        return new Expr.Literal(left.value * right.value, left.type);
                    break;
                    
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

    visitCallExpr(expr: Expr.Call): Expr {
        expr.callee = expr.callee.accept(this);
        let parameters : Expr.PairParameter[] = [];

        expr.parameters.forEach(([token, expr]) =>{
            parameters.push([token, expr.accept(this)])
        });

        expr.parameters = parameters;

        return expr;
    }

    visitGroupingExpr(expr: Expr.Grouping): Expr {
        expr.inner = expr.inner.accept(this);

        // Unbox grouping or literal inside a grouping
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

        // Evaluate literal expression
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