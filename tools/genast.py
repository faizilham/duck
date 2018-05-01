from types import MethodType
output_dir = "src/duck/ast"

AST = {
    "Expr": (
        [ 
            ("Token", "../token"),
            ("DuckType", "../types")
        ],
        [
            "public type : DuckType = null"
        ],
        [
            
            "Binary     -> left: Expr, operator: Token, right: Expr",
            "Grouping   -> expr: Expr",
            "Literal    -> value: any, type: DuckType",
            "Unary      -> operator: Token, expr: Expr",
            "Variable   -> name: Token",
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

def define_ast(basename, imports, baseprops, type_data):
    with open(output_dir + "/" + basename.lower() + ".ts", "w") as writer:
        extend_writer(writer)

        for im, src in imports:
            writer.writeln("import {{ {} }} from '{}';".format(im, src))

        writer.writeln()

        writer.start_block("export abstract class {}".format(basename))
        for props in baseprops:
            writer.writeln("{};".format(props))

        writer.end_block()
        writer.writeln()
        
        types = parse_types(type_data)
            
        # AST Classes
        writer.start_block("export namespace {}".format(basename))

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

        # Visitor Abstract Class
        writer.start_block("export abstract class Visitor<T>".format(basename))
        
        for (classname, _ ) in types:
            writer.writeln("abstract visit{0}{1}(expr: {0}) : T;".format(classname, basename))
        
        writer.end_block()

        writer.end_block()


for (basename, (imports, baseprops, types)) in AST.items():
    define_ast(basename, imports, baseprops, types)