from types import MethodType
output_dir = "src/duck/ast"

AST = {
    "Expr": (
        [ 
            ("Token", "../token"),
            ("DuckType", "../types"),
        ],
        [
            "public type: DuckType | undefined"
        ],
        [
            "export type PairParameter = [Token | null, Expr]"            
        ],
        [
            
            "Binary     -> left: Expr, operator: Token, right: Expr",
            "Call       -> callee: Expr, token: Token, parameters: PairParameter[], type: DuckType | undefined = undefined",
            "Grouping   -> inner: Expr",
            "GetMember  -> token: Token, object: Expr, member: Token",
            "Indexing   -> token: Token, collection: Expr, index: Expr",
            "Literal    -> value: any, type: DuckType",
            "List       -> token: Token, elements: Expr[]",
            "Unary      -> operator: Token, right: Expr",
            "Variable   -> name: Token",
        ]
    ),
    "TypeExpr": (
        [ 
            ("Token", "../token"),
            ("DuckType", "../types"),
        ],
        [],
        [],
        [   
            "Basic      -> typeExpr: Token, type: DuckType",
            "List       -> typeExpr: Token, element: TypeExpr",
            "Custom     -> name: Token",            
        ]
    ),
    "Stmt": (
        [ 
            ("Token", "../token"),
            ("Expr", "./expr"),
            ("TypeExpr", "./typeexpr"),
            ("DuckType", "../types"),            
        ],
        [],
        [
            "export type Parameter = [Token, TypeExpr]"
        ],
        [
            
            "Assignment -> name: Token, expr: Expr",
            "Block      -> statements: Stmt[], localVars : number = 0",
            "Expression -> expr: Expr",
            "Func       -> name: Token, parameters: Parameter[], body: Stmt[], returnType?: TypeExpr, type?: DuckType",
            "If         -> token: Token, condition: Expr, thenBranch: Stmt, elseBranch?: Stmt",
            "SetIndex   -> target: Expr.Indexing, token: Token, expr: Expr",
            "SetMember  -> target: Expr.GetMember, token: Token, expr: Expr",
            "Struct     -> name: Token, members: Parameter[], type? : DuckType",
            "While      -> token: Token, condition: Expr, body: Stmt",
            "VarDecl    -> name: Token, typeExpr?: TypeExpr, expr?: Expr, type?: DuckType",
        ]
    ),
}

TAB = " "*4

def extend_writer(writer):
    def inc_tab(self):
        self.tab += 1

    def dec_tab(self):
        self.tab -= 1

    def writeln(self, text = ""):
        tab = "" if text == "" else TAB*self.tab
        self.write("{0}{1}\n".format(tab, text))

    def start_block(self, text=""):
        self.writeln(text + " {")
        self.inc_tab()

    def end_block(self, eof=False):
        self.dec_tab()
        if not eof: self.writeln('}')
        else: self.write('}')

    writer.tab = 0
    writer.writeln = MethodType(writeln, writer)
    writer.inc_tab = MethodType(inc_tab, writer)
    writer.dec_tab = MethodType(dec_tab, writer)
    writer.start_block = MethodType(start_block, writer)
    writer.end_block = MethodType(end_block, writer)

def parse_types(type_data):
    types = []
    # Enum values
    for _type in type_data:
        entries = _type.split("->")
        classname = entries[0].strip()
        field_data = entries[1].strip().split(", ")
        fields = []

        for field in field_data:
            name, datatype = field.split(':')
            fields.append((name.strip(), datatype.strip()))

        types.append((classname, fields))
    
    return types

def define_ast(basename, imports, baseprops, exports, type_data):
    with open(output_dir + "/" + basename.lower() + ".ts", "w") as writer:
        extend_writer(writer)

        for im, src in imports:
            writer.writeln("import {{ {} }} from '{}';".format(im, src))

        writer.writeln()

        writer.start_block("export abstract class {}".format(basename))

        for prop in baseprops:
            writer.writeln("{};".format(prop))

        writer.writeln("public abstract accept<T>(visitor : {}.Visitor<T>) : T;".format(basename))

        writer.end_block()
        writer.writeln()
        
        types = parse_types(type_data)
            
        # AST Classes
        writer.start_block("export namespace {}".format(basename))

        for ex in exports:
            writer.writeln("{};".format(ex))

        for (classname, fields) in types:
            writer.start_block("export class {} extends {}".format(classname, basename))

            items = ", ".join(['public {}: {}'.format(*field) for field in fields])            

            writer.start_block("constructor({})".format(items))
            writer.writeln("super();")
            writer.end_block()
            writer.writeln()

            writer.start_block("public accept<T>(visitor : Visitor<T>) : T")
            writer.writeln("return visitor.visit{}{}(this);".format(classname, basename))
            writer.end_block()

            writer.end_block()
            writer.writeln()

        # Visitor Interface
        writer.start_block("export interface Visitor<T>".format(basename))
        
        for (classname, _ ) in types:
            writer.writeln("visit{0}{1}({2}: {0}) : T;".format(classname, basename, basename.lower()))
        
        writer.end_block()

        writer.end_block()


for (basename, (imports, baseprops, exports, types)) in AST.items():
    define_ast(basename, imports, baseprops, exports, types)