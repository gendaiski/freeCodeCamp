/** 20 tracks × 3 exercises. Every stdio exercise ships a verified reference solution. */
import { LANGUAGES } from '@lawmads/shared';

export interface SeedTest { name: string; input: string; expected: string; weight?: number; hidden?: boolean }
export interface SeedExercise {
  slug: string; language: string; ordinal: 1 | 2 | 3; title: string; difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string; checks: string[]; starter: string; solution: string; hints: string[]; tests: SeedTest[];
  structural?: Array<{ type: 'regex' | 'json'; pattern?: string; flags?: string; path?: string; min?: number; message: string; weight?: number }>;
  credits: number;
}

type Variant = 'sum' | 'parity' | 'greet';
const E2_VARIANT: Record<string, Variant> = { javascript: 'sum', python: 'parity', java: 'sum', csharp: 'greet', cpp: 'sum', c: 'sum', go: 'sum', php: 'sum', r: 'sum', dart: 'greet', typescript: 'sum', ruby: 'sum', rust: 'sum', kotlin: 'greet', swift: 'sum' };

const HELLO_TESTS: SeedTest[] = [{ name: 'prints greeting', input: '', expected: 'Hello, Lawmads!', hidden: false }];
const SUM_TESTS: SeedTest[] = [{ name: 'sample', input: '3 4', expected: '7', hidden: false }, { name: 'negatives', input: '10 -2', expected: '8' }, { name: 'large', input: '99999 1', expected: '100000' }];
const PARITY_TESTS: SeedTest[] = [{ name: 'even', input: '4', expected: 'EVEN', hidden: false }, { name: 'odd', input: '7', expected: 'ODD' }, { name: 'zero', input: '0', expected: 'EVEN' }];
const GREET_TESTS: SeedTest[] = [{ name: 'sample', input: 'Nour', expected: 'Hello, Nour!', hidden: false }, { name: 'two words', input: 'Ahmed El Gendy', expected: 'Hello, Ahmed El Gendy!' }];
const REFUND_TESTS: SeedTest[] = [{ name: 'within window', input: '10', expected: 'REFUND', hidden: false }, { name: 'boundary', input: '14', expected: 'REFUND' }, { name: 'late', input: '15', expected: 'NO REFUND' }];
const DEADLINE_TESTS: SeedTest[] = [{ name: 'sample', input: '30 12', expected: '18', hidden: false }, { name: 'overdue clamps to 0', input: '10 12', expected: '0' }];

// ---------------------------------------------------------------------------
// Per-language source: [hello, e2, capstone]
// ---------------------------------------------------------------------------
const SRC: Record<string, { starter: [string, string, string]; solution: [string, string, string] }> = {
  javascript: {
    starter: [
      '// Print exactly: Hello, Lawmads!\n',
      '// Read two integers from stdin and print their sum.\nconst [a, b] = require("fs").readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\n// TODO\n',
      '// IP Clause Validator — print VALID if the clause contains all three\n// enforceability terms (assigns, copyright, consideration), else INVALID.\nconst clause = require("fs").readFileSync(0, "utf8").trim();\nfunction isValidIPClause(clause) {\n  // TODO\n}\nconsole.log(isValidIPClause(clause) ? "VALID" : "INVALID");\n'
    ],
    solution: [
      'console.log("Hello, Lawmads!");\n',
      'const [a, b] = require("fs").readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\nconsole.log(a + b);\n',
      'const clause = require("fs").readFileSync(0, "utf8").trim();\nfunction isValidIPClause(clause) {\n  const required = ["assigns", "copyright", "consideration"];\n  return required.every((t) => clause.toLowerCase().includes(t));\n}\nconsole.log(isValidIPClause(clause) ? "VALID" : "INVALID");\n'
    ]
  },
  python: {
    starter: ['# Print exactly: Hello, Lawmads!\n', 'n = int(input())\n# Print EVEN or ODD\n', '# Limitation Period Calculator\n# Input: <years_elapsed> <limitation_years>\n# Print TIME-BARRED if the period has expired (elapsed >= limitation), else IN TIME.\nelapsed, limitation = map(int, input().split())\n# TODO\n'],
    solution: ['print("Hello, Lawmads!")\n', 'n = int(input())\nprint("EVEN" if n % 2 == 0 else "ODD")\n', 'elapsed, limitation = map(int, input().split())\nprint("TIME-BARRED" if elapsed >= limitation else "IN TIME")\n']
  },
  sql: {
    starter: [
      "-- Print exactly one row containing: Hello, Lawmads!\n",
      "CREATE TABLE clients(id INTEGER, name TEXT, city TEXT);\nINSERT INTO clients VALUES (1,'Meridian','Cairo'),(2,'Northwind','Dubai'),(3,'Delta Corp','Cairo');\n-- TODO: select the names of clients in Cairo, ordered by name\n",
      "CREATE TABLE contracts(id INTEGER, client TEXT, expires_on TEXT);\nINSERT INTO contracts VALUES (1,'Meridian','2027-03-01'),(2,'Northwind','2026-11-15'),(3,'Delta Corp','2026-10-02'),(4,'Atlas','2026-12-31');\n-- TODO: clients whose contracts expire before 2026-12-31, earliest first\n"
    ],
    solution: [
      "SELECT 'Hello, Lawmads!';\n",
      "CREATE TABLE clients(id INTEGER, name TEXT, city TEXT);\nINSERT INTO clients VALUES (1,'Meridian','Cairo'),(2,'Northwind','Dubai'),(3,'Delta Corp','Cairo');\nSELECT name FROM clients WHERE city = 'Cairo' ORDER BY name;\n",
      "CREATE TABLE contracts(id INTEGER, client TEXT, expires_on TEXT);\nINSERT INTO contracts VALUES (1,'Meridian','2027-03-01'),(2,'Northwind','2026-11-15'),(3,'Delta Corp','2026-10-02'),(4,'Atlas','2026-12-31');\nSELECT client FROM contracts WHERE expires_on < '2026-12-31' ORDER BY expires_on;\n"
    ]
  },
  java: {
    starter: ['public class Main {\n  public static void main(String[] args) {\n    // Print exactly: Hello, Lawmads!\n  }\n}\n', 'import java.util.Scanner;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner in = new Scanner(System.in);\n    int a = in.nextInt(), b = in.nextInt();\n    // TODO print a + b\n  }\n}\n', 'import java.util.Scanner;\n// Contract model: read client (line 1) and value (line 2); print Contract(client=..., value=...)\npublic class Main {\n  static class Contract { String client; long value; }\n  public static void main(String[] args) {\n    Scanner in = new Scanner(System.in);\n    // TODO\n  }\n}\n'],
    solution: ['public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, Lawmads!");\n  }\n}\n', 'import java.util.Scanner;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner in = new Scanner(System.in);\n    int a = in.nextInt(), b = in.nextInt();\n    System.out.println(a + b);\n  }\n}\n', 'import java.util.Scanner;\npublic class Main {\n  static class Contract { String client; long value; Contract(String c, long v){client=c;value=v;} public String toString(){ return "Contract(client=" + client + ", value=" + value + ")"; } }\n  public static void main(String[] args) {\n    Scanner in = new Scanner(System.in);\n    String client = in.nextLine().trim();\n    long value = Long.parseLong(in.nextLine().trim());\n    System.out.println(new Contract(client, value));\n  }\n}\n']
  },
  csharp: {
    starter: ['using System;\nclass Program {\n  static void Main() {\n    // Print exactly: Hello, Lawmads!\n  }\n}\n', 'using System;\nclass Program {\n  static void Main() {\n    string name = Console.ReadLine().Trim();\n    // TODO print Hello, <name>!\n  }\n}\n', 'using System;\n// Refund rule: REFUND if days since purchase <= 14, else NO REFUND\nclass Program {\n  static void Main() {\n    int days = int.Parse(Console.ReadLine().Trim());\n    // TODO\n  }\n}\n'],
    solution: ['using System;\nclass Program {\n  static void Main() {\n    Console.WriteLine("Hello, Lawmads!");\n  }\n}\n', 'using System;\nclass Program {\n  static void Main() {\n    string name = Console.ReadLine().Trim();\n    Console.WriteLine("Hello, " + name + "!");\n  }\n}\n', 'using System;\nclass Program {\n  static void Main() {\n    int days = int.Parse(Console.ReadLine().Trim());\n    Console.WriteLine(days <= 14 ? "REFUND" : "NO REFUND");\n  }\n}\n']
  },
  cpp: {
    starter: ['#include <iostream>\nint main() {\n  // Print exactly: Hello, Lawmads!\n  return 0;\n}\n', '#include <iostream>\nint main() {\n  long a, b; std::cin >> a >> b;\n  // TODO print a + b\n  return 0;\n}\n', '#include <iostream>\n// Court Fee Calculator: fee = 2% of the claim, minimum 100. Print the fee as an integer.\nint main() {\n  long claim; std::cin >> claim;\n  // TODO\n  return 0;\n}\n'],
    solution: ['#include <iostream>\nint main() {\n  std::cout << "Hello, Lawmads!" << std::endl;\n  return 0;\n}\n', '#include <iostream>\nint main() {\n  long a, b; std::cin >> a >> b;\n  std::cout << a + b << std::endl;\n  return 0;\n}\n', '#include <iostream>\nint main() {\n  long claim; std::cin >> claim;\n  long fee = claim * 2 / 100; if (fee < 100) fee = 100;\n  std::cout << fee << std::endl;\n  return 0;\n}\n']
  },
  c: {
    starter: ['#include <stdio.h>\nint main(void) {\n  /* Print exactly: Hello, Lawmads! */\n  return 0;\n}\n', '#include <stdio.h>\nint main(void) {\n  int a, b; scanf("%d %d", &a, &b);\n  /* TODO print a + b with %d */\n  return 0;\n}\n', '#include <stdio.h>\n/* Deadline Days: input <total_days> <elapsed_days>; print remaining days (never below 0). */\nint main(void) {\n  int total, elapsed; scanf("%d %d", &total, &elapsed);\n  /* TODO */\n  return 0;\n}\n'],
    solution: ['#include <stdio.h>\nint main(void) {\n  printf("Hello, Lawmads!\\n");\n  return 0;\n}\n', '#include <stdio.h>\nint main(void) {\n  int a, b; scanf("%d %d", &a, &b);\n  printf("%d\\n", a + b);\n  return 0;\n}\n', '#include <stdio.h>\nint main(void) {\n  int total, elapsed; scanf("%d %d", &total, &elapsed);\n  int rem = total - elapsed; if (rem < 0) rem = 0;\n  printf("%d\\n", rem);\n  return 0;\n}\n']
  },
  go: {
    starter: ['package main\n\nimport "fmt"\n\nfunc main() {\n\t// Print exactly: Hello, Lawmads!\n\tfmt.Println()\n}\n', 'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar a, b int\n\tfmt.Scan(&a, &b)\n\t// TODO print a + b\n}\n', 'package main\n\n// NDA Screener: print NDA if the text mentions "confidential" (any case), else NOT NDA.\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n)\n\nfunc main() {\n\treader := bufio.NewReader(os.Stdin)\n\tline, _ := reader.ReadString(\'\\n\')\n\t_ = line\n\t// TODO\n\tfmt.Println()\n}\n'],
    solution: ['package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("Hello, Lawmads!")\n}\n', 'package main\n\nimport "fmt"\n\nfunc main() {\n\tvar a, b int\n\tfmt.Scan(&a, &b)\n\tfmt.Println(a + b)\n}\n', 'package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n\t"strings"\n)\n\nfunc main() {\n\treader := bufio.NewReader(os.Stdin)\n\tline, _ := reader.ReadString(\'\\n\')\n\tif strings.Contains(strings.ToLower(line), "confidential") {\n\t\tfmt.Println("NDA")\n\t} else {\n\t\tfmt.Println("NOT NDA")\n\t}\n}\n']
  },
  php: {
    starter: ['<?php\n// Print exactly: Hello, Lawmads!\n', '<?php\nfscanf(STDIN, "%d %d", $a, $b);\n// TODO echo $a + $b\n', '<?php\n// E-Shop Refund Rule: input "<days> <opened>" — REFUND if days <= 14 and the item is unopened (opened == 0), else NO REFUND\nfscanf(STDIN, "%d %d", $days, $opened);\n// TODO\n'],
    solution: ['<?php\necho "Hello, Lawmads!\\n";\n', '<?php\nfscanf(STDIN, "%d %d", $a, $b);\necho ($a + $b) . "\\n";\n', '<?php\nfscanf(STDIN, "%d %d", $days, $opened);\necho ($days <= 14 && $opened == 0) ? "REFUND\\n" : "NO REFUND\\n";\n']
  },
  r: {
    starter: ['# Print exactly: Hello, Lawmads!\n', 'x <- scan(file("stdin"), quiet = TRUE)\n# TODO: print the sum of the two numbers with cat()\n', '# Case Duration Analytics: read a line of case durations (days) and print the mean rounded to 1 decimal\nx <- scan(file("stdin"), quiet = TRUE)\n# TODO\n'],
    solution: ['cat("Hello, Lawmads!\\n")\n', 'x <- scan(file("stdin"), quiet = TRUE)\ncat(x[1] + x[2], "\\n", sep = "")\n', 'x <- scan(file("stdin"), quiet = TRUE)\ncat(format(round(mean(x), 1), nsmall = 1), "\\n", sep = "")\n']
  },
  dart: {
    starter: ["void main() {\n  // Print exactly: Hello, Lawmads!\n}\n", "import 'dart:io';\nvoid main() {\n  final name = stdin.readLineSync()!.trim();\n  // TODO print 'Hello, $name!'\n}\n", "import 'dart:io';\n// Client Intake Model: read name (line 1) and matter (line 2); print 'Intake: <name> — <matter>'\nclass Intake { final String name; final String matter; Intake(this.name, this.matter); }\nvoid main() {\n  // TODO\n}\n"],
    solution: ["void main() {\n  print('Hello, Lawmads!');\n}\n", "import 'dart:io';\nvoid main() {\n  final name = stdin.readLineSync()!.trim();\n  print('Hello, $name!');\n}\n", "import 'dart:io';\nclass Intake { final String name; final String matter; Intake(this.name, this.matter); @override String toString() => 'Intake: $name — $matter'; }\nvoid main() {\n  final name = stdin.readLineSync()!.trim();\n  final matter = stdin.readLineSync()!.trim();\n  print(Intake(name, matter));\n}\n"]
  },
  typescript: {
    starter: ['// Print exactly: Hello, Lawmads!\n', 'import { readFileSync } from "node:fs";\nconst [a, b]: number[] = readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\nfunction add(x: number, y: number): number {\n  // TODO\n  return 0;\n}\nconsole.log(add(a!, b!));\n', 'import { readFileSync } from "node:fs";\n// Typed Contract Portfolio: read contract values (one line, space-separated) and print the total value.\ninterface Contract { value: number }\nconst contracts: Contract[] = readFileSync(0, "utf8").trim().split(/\\s+/).map((v) => ({ value: Number(v) }));\n// TODO print the total\n'],
    solution: ['console.log("Hello, Lawmads!");\n', 'import { readFileSync } from "node:fs";\nconst [a, b]: number[] = readFileSync(0, "utf8").trim().split(/\\s+/).map(Number);\nfunction add(x: number, y: number): number {\n  return x + y;\n}\nconsole.log(add(a!, b!));\n', 'import { readFileSync } from "node:fs";\ninterface Contract { value: number }\nconst contracts: Contract[] = readFileSync(0, "utf8").trim().split(/\\s+/).map((v) => ({ value: Number(v) }));\nconst total: number = contracts.reduce((s, c) => s + c.value, 0);\nconsole.log(total);\n']
  },
  ruby: {
    starter: ['# Print exactly: Hello, Lawmads!\n', 'a, b = STDIN.read.split.map(&:to_i)\n# TODO puts a + b\n', '# Refund Predicate: REFUND if days since purchase <= 14, else NO REFUND\ndays = gets.to_i\n# TODO\n'],
    solution: ['puts "Hello, Lawmads!"\n', 'a, b = STDIN.read.split.map(&:to_i)\nputs a + b\n', 'days = gets.to_i\nputs days <= 14 ? "REFUND" : "NO REFUND"\n']
  },
  rust: {
    starter: ['fn main() {\n    // Print exactly: Hello, Lawmads!\n}\n', 'use std::io::Read;\nfn main() {\n    let mut s = String::new();\n    std::io::stdin().read_to_string(&mut s).unwrap();\n    let v: Vec<i64> = s.split_whitespace().map(|x| x.parse().unwrap()).collect();\n    // TODO print v[0] + v[1]\n}\n', 'use std::io::Read;\n// Deadline Function: input <total_days> <elapsed_days>; print remaining days, never below 0\nfn remaining(total: i64, elapsed: i64) -> i64 {\n    // TODO\n    0\n}\nfn main() {\n    let mut s = String::new();\n    std::io::stdin().read_to_string(&mut s).unwrap();\n    let v: Vec<i64> = s.split_whitespace().map(|x| x.parse().unwrap()).collect();\n    println!("{}", remaining(v[0], v[1]));\n}\n'],
    solution: ['fn main() {\n    println!("Hello, Lawmads!");\n}\n', 'use std::io::Read;\nfn main() {\n    let mut s = String::new();\n    std::io::stdin().read_to_string(&mut s).unwrap();\n    let v: Vec<i64> = s.split_whitespace().map(|x| x.parse().unwrap()).collect();\n    println!("{}", v[0] + v[1]);\n}\n', 'use std::io::Read;\nfn remaining(total: i64, elapsed: i64) -> i64 {\n    let r = total - elapsed;\n    if r < 0 { 0 } else { r }\n}\nfn main() {\n    let mut s = String::new();\n    std::io::stdin().read_to_string(&mut s).unwrap();\n    let v: Vec<i64> = s.split_whitespace().map(|x| x.parse().unwrap()).collect();\n    println!("{}", remaining(v[0], v[1]));\n}\n']
  },
  kotlin: {
    starter: ['fun main() {\n    // Print exactly: Hello, Lawmads!\n}\n', 'fun main() {\n    val name = readLine()!!.trim()\n    // TODO print "Hello, $name!"\n}\n', '// Contract Check: print SIGNED if the line contains "signed" (any case), else UNSIGNED\nfun main() {\n    val line = readLine() ?: ""\n    // TODO\n}\n'],
    solution: ['fun main() {\n    println("Hello, Lawmads!")\n}\n', 'fun main() {\n    val name = readLine()!!.trim()\n    println("Hello, $name!")\n}\n', 'fun main() {\n    val line = readLine() ?: ""\n    println(if (line.lowercase().contains("signed")) "SIGNED" else "UNSIGNED")\n}\n']
  },
  swift: {
    starter: ['// Print exactly: Hello, Lawmads!\n', 'let parts = readLine()!.split(separator: " ").map { Int($0)! }\nlet a = parts[0]\nlet b = parts[1]\n// TODO print(a + b)\n', '// Refund Function: REFUND if days since purchase <= 14, else NO REFUND\nfunc refund(days: Int) -> String {\n    // TODO\n    return ""\n}\nlet days = Int(readLine()!.trimmingCharacters(in: .whitespaces))!\nprint(refund(days: days))\n'],
    solution: ['print("Hello, Lawmads!")\n', 'let parts = readLine()!.split(separator: " ").map { Int($0)! }\nlet a = parts[0]\nlet b = parts[1]\nprint(a + b)\n', 'func refund(days: Int) -> String {\n    return days <= 14 ? "REFUND" : "NO REFUND"\n}\nlet days = Int(readLine()!.trimmingCharacters(in: .whitespaces))!\nprint(refund(days: days))\n']
  }
};

const CAPSTONE_TESTS: Record<string, SeedTest[]> = {
  javascript: [{ name: 'valid clause', input: 'The Supplier hereby assigns all copyright in the Deliverables to the Client for good consideration.', expected: 'VALID', hidden: false }, { name: 'missing consideration', input: 'The Supplier assigns all copyright to the Client.', expected: 'INVALID' }, { name: 'case-insensitive', input: 'ASSIGNS COPYRIGHT CONSIDERATION', expected: 'VALID' }],
  python: [{ name: 'in time', input: '2 3', expected: 'IN TIME', hidden: false }, { name: 'time-barred', input: '3 3', expected: 'TIME-BARRED' }, { name: 'long overdue', input: '15 10', expected: 'TIME-BARRED' }],
  sql: [{ name: 'result', input: '', expected: 'Delta Corp\nNorthwind', hidden: false }],
  java: [{ name: 'sample', input: 'Meridian\n120000', expected: 'Contract(client=Meridian, value=120000)', hidden: false }, { name: 'spaces', input: 'El Gendy & Partners\n5000', expected: 'Contract(client=El Gendy & Partners, value=5000)' }],
  csharp: REFUND_TESTS,
  cpp: [{ name: '2 percent', input: '10000', expected: '200', hidden: false }, { name: 'minimum fee', input: '1000', expected: '100' }, { name: 'large claim', input: '2500000', expected: '50000' }],
  c: DEADLINE_TESTS,
  go: [{ name: 'nda', input: 'This Confidential Disclosure Agreement...', expected: 'NDA', hidden: false }, { name: 'not nda', input: 'This Services Agreement is made between...', expected: 'NOT NDA' }],
  php: [{ name: 'refund', input: '10 0', expected: 'REFUND', hidden: false }, { name: 'opened', input: '10 1', expected: 'NO REFUND' }, { name: 'late', input: '20 0', expected: 'NO REFUND' }],
  r: [{ name: 'mean', input: '10 20 30', expected: '20.0', hidden: false }, { name: 'rounded', input: '7 8 12', expected: '9.0' }, { name: 'decimal', input: '1 2', expected: '1.5' }],
  dart: [{ name: 'sample', input: 'Nour\nTrademark opposition', expected: 'Intake: Nour — Trademark opposition', hidden: false }],
  typescript: [{ name: 'total', input: '100 250 50', expected: '400', hidden: false }, { name: 'single', input: '75', expected: '75' }],
  ruby: REFUND_TESTS,
  rust: DEADLINE_TESTS,
  kotlin: [{ name: 'signed', input: 'Agreement duly SIGNED by both parties', expected: 'SIGNED', hidden: false }, { name: 'unsigned', input: 'Draft agreement pending', expected: 'UNSIGNED' }],
  swift: REFUND_TESTS
};

const E2_TESTS: Record<Variant, SeedTest[]> = { sum: SUM_TESTS, parity: PARITY_TESTS, greet: GREET_TESTS };
const E2_INSTRUCTIONS: Record<Variant, string> = {
  sum: 'Read two integers from standard input (separated by whitespace) and print their **sum** on one line.\n\n**Example** — Input: `3 4` → Output: `7`',
  parity: 'Read one integer `n` and print `EVEN` if it is even, otherwise `ODD`.\n\n**Example** — Input: `4` → Output: `EVEN`',
  greet: 'Read a name from standard input and print `Hello, <name>!`.\n\n**Example** — Input: `Nour` → Output: `Hello, Nour!`'
};

const CAPSTONE_INSTRUCTIONS: Record<string, string> = {
  javascript: '# IP Clause Validator\n\nAn IP assignment clause is only enforceable in our simplified rule if it contains **all three** terms: `assigns`, `copyright` and `consideration` (case-insensitive).\n\nRead the clause from standard input and print `VALID` or `INVALID`.',
  python: '# Limitation Period Calculator\n\nInput: `<years_elapsed> <limitation_years>`. A claim is **time-barred** once the elapsed years reach the limitation period.\n\nPrint `TIME-BARRED` or `IN TIME`.',
  sql: '# Expiring Contracts\n\nThe `contracts` table is created for you. Return the **client** names whose contracts expire **before** `2026-12-31`, earliest expiry first.\n\nExpected:\n```\nDelta Corp\nNorthwind\n```',
  java: '# Contract model\n\nRead the client name (line 1) and the contract value (line 2). Build a `Contract` object and print it as `Contract(client=<name>, value=<value>)`.',
  csharp: '# Refund rule\n\nRead the number of days since purchase. Print `REFUND` if it is 14 or fewer, otherwise `NO REFUND`.',
  cpp: '# Court Fee Calculator\n\nRead the claim amount. The fee is **2%** of the claim with a **minimum of 100**. Print the fee as an integer.',
  c: '# Deadline Days\n\nInput: `<total_days> <elapsed_days>`. Print the remaining days, never below `0`.',
  go: '# NDA Screener\n\nRead one line. Print `NDA` if it mentions `confidential` (any case), else `NOT NDA`.',
  php: '# E-Shop Refund Rule\n\nInput: `<days> <opened>`. Print `REFUND` only if the item was returned within **14 days** and is **unopened** (`opened` = 0). Otherwise `NO REFUND`.',
  r: '# Case Duration Analytics\n\nRead a line of case durations in days and print their **mean rounded to one decimal** (e.g. `20.0`).',
  dart: '# Client Intake Model\n\nRead the client name (line 1) and the matter (line 2). Print `Intake: <name> — <matter>` from an `Intake` class.',
  typescript: '# Typed Contract Portfolio\n\nRead a line of contract values. Type them as `Contract[]` and print the **total value**.',
  ruby: '# Refund Predicate\n\nRead the days since purchase. Print `REFUND` if ≤ 14, else `NO REFUND`.',
  rust: '# Deadline Function\n\nImplement `remaining(total, elapsed)` — the remaining days, never below `0` — and print it.',
  kotlin: '# Contract Check\n\nRead a line. Print `SIGNED` if it contains `signed` (any case), else `UNSIGNED`.',
  swift: '# Refund Function\n\nImplement `refund(days:)` returning `REFUND` when days ≤ 14, else `NO REFUND`.'
};

const CAPSTONE_CHECKS: Record<string, string[]> = {
  javascript: ['Reads the clause from stdin', 'Detects all three terms case-insensitively', 'Prints VALID / INVALID'],
  python: ['Parses two integers', 'elapsed ≥ limitation → TIME-BARRED', 'Otherwise IN TIME'],
  sql: ['Filters on expires_on', 'Orders by expiry ascending', 'Returns only the client column'],
  java: ['Reads two lines', 'Uses a Contract class', 'Formats exactly'],
  csharp: ['Parses the integer', 'Boundary at 14 days', 'Prints exactly'],
  cpp: ['Computes 2%', 'Applies the 100 minimum', 'Integer output'],
  c: ['Reads with scanf', 'Clamps at zero', 'Prints with %d'],
  go: ['Reads the whole line', 'Case-insensitive match', 'Prints NDA / NOT NDA'],
  php: ['Parses both values', 'Both conditions required', 'Prints exactly'],
  r: ['Reads from stdin', 'Uses mean()', 'One decimal'],
  dart: ['Reads two lines', 'Uses an Intake class', 'Formats with an em dash'],
  typescript: ['Typed Contract interface', 'reduce() to a number', 'Prints the total'],
  ruby: ['gets.to_i', 'Ternary or if', 'Prints exactly'],
  rust: ['remaining() implemented', 'Never negative', 'println! result'],
  kotlin: ['lowercase() match', 'Prints exactly', 'Handles empty input'],
  swift: ['refund(days:) implemented', 'Boundary at 14', 'Prints exactly']
};

function stdio(lang: string): SeedExercise[] {
  const L = LANGUAGES.find((l) => l.slug === lang)!;
  const src = SRC[lang]!;
  const variant = E2_VARIANT[lang] ?? 'sum';
  const [n1, n2, n3] = L.sequence;
  return [
    { slug: `${lang}-1`, language: lang, ordinal: 1, title: n1, difficulty: 'beginner', instructions: `# ${n1}\n\nPrint exactly \`Hello, Lawmads!\` on one line. This is the first ${L.name} exercise — get the toolchain and the output contract right.`, checks: ['Prints exactly one line', 'Text matches character-for-character'], starter: src.starter[0], solution: src.solution[0], hints: ['Output goes to standard output.', 'Watch the comma and the exclamation mark.'], tests: HELLO_TESTS, credits: 3 },
    lang === 'sql'
      ? { slug: 'sql-2', language: 'sql', ordinal: 2, title: n2, difficulty: 'beginner', instructions: '# WHERE\n\nThe `clients` table is created for you. Return the **names** of clients based in `Cairo`, ordered by name.\n\nExpected:\n```\nDelta Corp\nMeridian\n```', checks: ['Filters with WHERE', 'Orders by name', 'Returns only the name column'], starter: src.starter[1], solution: src.solution[1], hints: ['WHERE city = ...', 'ORDER BY name'], tests: [{ name: 'result', input: '', expected: 'Delta Corp\nMeridian', hidden: false }], credits: 3 }
      : { slug: `${lang}-2`, language: lang, ordinal: 2, title: n2, difficulty: 'beginner', instructions: `# ${n2}\n\n${E2_INSTRUCTIONS[variant]}`, checks: ['Reads standard input', 'Prints the correct value', 'No extra output'], starter: src.starter[1], solution: src.solution[1], hints: ['Read all of stdin first, then parse.', 'Print only the answer — no labels.'], tests: E2_TESTS[variant], credits: 3 },
    { slug: `${lang}-3`, language: lang, ordinal: 3, title: n3, difficulty: 'intermediate', instructions: CAPSTONE_INSTRUCTIONS[lang]!, checks: CAPSTONE_CHECKS[lang]!, starter: src.starter[2], solution: src.solution[2], hints: ['Model the legal rule first, then encode it.', 'Test the boundary case the rule names.', 'Compare your output with the sample exactly.'], tests: CAPSTONE_TESTS[lang]!, credits: 10 }
  ];
}

const HTML: SeedExercise[] = [
  { slug: 'html-1', language: 'html', ordinal: 1, title: 'Headings', difficulty: 'beginner', instructions: '# Headings\n\nCreate a page with an `<h1>` that reads **Lawmads** and an `<h2>` that reads **The Legal Technology Academy**.', checks: ['Has an <h1> containing Lawmads', 'Has an <h2>', 'Valid HTML skeleton'], starter: '<!doctype html>\n<html>\n  <head><title>Lawmads</title></head>\n  <body>\n    <!-- TODO -->\n  </body>\n</html>\n', solution: '<!doctype html>\n<html>\n  <head><title>Lawmads</title></head>\n  <body>\n    <h1>Lawmads</h1>\n    <h2>The Legal Technology Academy</h2>\n  </body>\n</html>\n', hints: ['Headings go inside <body>.'], tests: [], credits: 3,
    structural: [{ type: 'regex', pattern: '<h1[^>]*>\\s*Lawmads\\s*</h1>', flags: 'i', message: 'An <h1> containing "Lawmads"', weight: 2 }, { type: 'regex', pattern: '<h2[^>]*>[^<]+</h2>', flags: 'i', message: 'An <h2> with text', weight: 1 }, { type: 'regex', pattern: '<body[\\s\\S]*</body>', flags: 'i', message: 'A <body> element', weight: 1 }] },
  { slug: 'html-2', language: 'html', ordinal: 2, title: 'Styling', difficulty: 'beginner', instructions: '# Styling\n\nAdd a `<style>` block that gives the `h1` the brand red `#E01E1E` and sets a `font-family`.', checks: ['<style> block present', 'h1 rule uses #E01E1E', 'font-family declared'], starter: '<!doctype html>\n<html>\n  <head>\n    <title>Lawmads</title>\n    <!-- TODO: add a <style> block -->\n  </head>\n  <body>\n    <h1>Lawmads</h1>\n  </body>\n</html>\n', solution: '<!doctype html>\n<html>\n  <head>\n    <title>Lawmads</title>\n    <style>\n      body { font-family: Archivo, system-ui, sans-serif; }\n      h1 { color: #E01E1E; }\n    </style>\n  </head>\n  <body>\n    <h1>Lawmads</h1>\n  </body>\n</html>\n', hints: ['CSS colours can be hex values.'], tests: [], credits: 3,
    structural: [{ type: 'regex', pattern: '<style[\\s\\S]*</style>', flags: 'i', message: 'A <style> block', weight: 1 }, { type: 'regex', pattern: 'h1\\s*\\{[^}]*#e01e1e', flags: 'i', message: 'h1 coloured #E01E1E', weight: 2 }, { type: 'regex', pattern: 'font-family\\s*:', flags: 'i', message: 'A font-family declaration', weight: 1 }] },
  { slug: 'html-3', language: 'html', ordinal: 3, title: 'Landing Page Build', difficulty: 'intermediate', instructions: '# Law firm landing page\n\nBuild a one-page site for a law firm: a `<nav>`, an `<h1>` headline, a paragraph, and a call-to-action `<button>` styled with a `background-color` **and** a `border-radius`.', checks: ['A <nav> element', 'An <h1> headline', 'A <button> call-to-action', 'The button has background-color and border-radius'], starter: '<!doctype html>\n<html>\n  <head>\n    <title>El Gendy & Partners</title>\n    <style>\n      /* TODO: style the button */\n    </style>\n  </head>\n  <body>\n    <!-- TODO: nav, h1, p, button -->\n  </body>\n</html>\n', solution: '<!doctype html>\n<html>\n  <head>\n    <title>El Gendy & Partners</title>\n    <style>\n      body { font-family: Archivo, system-ui, sans-serif; margin: 0; }\n      nav { display: flex; gap: 16px; padding: 16px; border-bottom: 1px solid #E5E3E1; }\n      button { background-color: #0B0B0C; color: #fff; border: 0; padding: 12px 20px; border-radius: 6px; }\n    </style>\n  </head>\n  <body>\n    <nav><a href="#">Practice</a><a href="#">Team</a><a href="#">Contact</a></nav>\n    <h1>Corporate counsel for the Delta Generation.</h1>\n    <p>Cairo · Dubai · London — bilingual, technology-literate, on your side.</p>\n    <button>Book a consultation</button>\n  </body>\n</html>\n', hints: ['Style the button in the <style> block.', 'background-color and border-radius are two separate properties.'], tests: [], credits: 10,
    structural: [{ type: 'regex', pattern: '<nav[\\s\\S]*</nav>', flags: 'i', message: 'A <nav> element', weight: 1 }, { type: 'regex', pattern: '<h1[^>]*>[^<]+</h1>', flags: 'i', message: 'An <h1> headline', weight: 1 }, { type: 'regex', pattern: '<button[\\s\\S]*</button>', flags: 'i', message: 'A <button> call-to-action', weight: 1 }, { type: 'regex', pattern: 'button\\s*\\{(?=[^}]*background-color)(?=[^}]*border-radius)[^}]*\\}', flags: 'i', message: 'The button has background-color and border-radius', weight: 1 }] }
];

const N8N: SeedExercise[] = [
  { slug: 'n8n-1', language: 'n8n', ordinal: 1, title: 'Workflow JSON', difficulty: 'beginner', instructions: '# Workflow JSON\n\nBuild a workflow with a **Webhook** trigger node. Export as JSON: an object with a `nodes` array where one node has type `webhook`.', checks: ['Valid JSON', 'nodes array present', 'A webhook node'], starter: '{\n  "name": "My first flow",\n  "nodes": [],\n  "connections": {}\n}\n', solution: '{\n  "name": "My first flow",\n  "nodes": [{ "id": "1", "name": "Webhook", "type": "webhook", "parameters": { "path": "intake" } }],\n  "connections": {}\n}\n', hints: ['Add a node object to the nodes array.'], tests: [], credits: 3,
    structural: [{ type: 'json', path: '$', message: 'Valid JSON object', weight: 1 }, { type: 'json', path: 'nodes', min: 1, message: 'At least one node', weight: 1 }, { type: 'json', path: 'nodes[*].type', pattern: '^webhook$', message: 'A webhook trigger', weight: 2 }] },
  { slug: 'n8n-2', language: 'n8n', ordinal: 2, title: 'IF logic', difficulty: 'beginner', instructions: '# IF logic\n\nAdd an **IF** node after the Webhook that branches on `matter_value > 10000`, and connect Webhook → IF.', checks: ['Webhook node', 'IF node with a condition', 'A connection from Webhook to IF'], starter: '{\n  "nodes": [{ "id": "1", "name": "Webhook", "type": "webhook", "parameters": { "path": "intake" } }],\n  "connections": {}\n}\n', solution: '{\n  "nodes": [\n    { "id": "1", "name": "Webhook", "type": "webhook", "parameters": { "path": "intake" } },\n    { "id": "2", "name": "IF", "type": "if", "parameters": { "condition": "matter_value > 10000" } }\n  ],\n  "connections": { "Webhook": [{ "to": "IF" }] }\n}\n', hints: ['connections maps a node name to its outgoing edges.'], tests: [], credits: 3,
    structural: [{ type: 'json', path: 'nodes[*].type', pattern: '^webhook$', message: 'A webhook trigger', weight: 1 }, { type: 'json', path: 'nodes[*].type', pattern: '^if$', message: 'An IF node', weight: 1 }, { type: 'json', path: 'nodes[*].parameters.condition', pattern: '.+', message: 'IF node has a condition', weight: 1 }, { type: 'json', path: 'connections.Webhook', min: 1, message: 'Webhook is connected onward', weight: 1 }] },
  { slug: 'n8n-3', language: 'n8n', ordinal: 3, title: 'Client Intake Pipeline', difficulty: 'intermediate', instructions: '# Client Intake Pipeline\n\nForm → conflict check → matter record. Build: **Webhook** → **IF** (conflict?) → **Set** (matter record) → **Email** notification, with a **Claude AI** node summarising the intake. All nodes connected.', checks: ['Webhook, IF, Set, Email nodes', 'A Claude AI node', 'Every non-trigger node has an incoming connection'], starter: '{\n  "nodes": [{ "id": "1", "name": "Webhook", "type": "webhook", "parameters": { "path": "intake" } }],\n  "connections": {}\n}\n', solution: '{\n  "nodes": [\n    { "id": "1", "name": "Webhook", "type": "webhook", "parameters": { "path": "intake" } },\n    { "id": "2", "name": "Conflict check", "type": "if", "parameters": { "condition": "conflict == false" } },\n    { "id": "3", "name": "Matter record", "type": "set", "parameters": { "fields": { "status": "open" } } },\n    { "id": "4", "name": "Summarise", "type": "claude", "parameters": { "prompt": "Summarise this intake in 3 lines" } },\n    { "id": "5", "name": "Notify", "type": "email", "parameters": { "to": "intake@firm.law" } }\n  ],\n  "connections": {\n    "Webhook": [{ "to": "Conflict check" }],\n    "Conflict check": [{ "to": "Matter record" }],\n    "Matter record": [{ "to": "Summarise" }],\n    "Summarise": [{ "to": "Notify" }]\n  }\n}\n', hints: ['Five nodes, four connections.', 'The AI node sits between the record and the notification.'], tests: [], credits: 10,
    structural: [{ type: 'json', path: 'nodes[*].type', pattern: '^webhook$', message: 'Webhook trigger', weight: 1 }, { type: 'json', path: 'nodes[*].type', pattern: '^if$', message: 'IF conflict check', weight: 1 }, { type: 'json', path: 'nodes[*].type', pattern: '^set$', message: 'Set matter record', weight: 1 }, { type: 'json', path: 'nodes[*].type', pattern: '^(email|slack)$', message: 'Email/Slack notification', weight: 1 }, { type: 'json', path: 'nodes[*].type', pattern: '^claude$', message: 'Claude AI node', weight: 1 }, { type: 'json', path: 'connections', min: 4, message: 'At least four connections', weight: 2 }] }
];

const CURSOR: SeedExercise[] = [
  { slug: 'cursor-1', language: 'cursor', ordinal: 1, title: '.cursorrules', difficulty: 'beginner', instructions: '# .cursorrules\n\nWrite a rules file for a legal-tech repository. It must: require **tests** for every change, forbid committing **secrets**, and name the **stack** (TypeScript).', checks: ['Mentions tests', 'Forbids secrets', 'Names TypeScript'], starter: '# Cursor rules — Lawmads repo\n\n', solution: '# Cursor rules — Lawmads repo\n\n- Stack: TypeScript, Node 22, React 18, PostgreSQL. Do not introduce other languages.\n- Every change ships with tests; run `npm test` before proposing a diff.\n- Never commit secrets, tokens or .env files. Use .env.example.\n- Prefer small, reviewable diffs with a one-line rationale.\n', hints: ['Rules are plain sentences the agent must follow.'], tests: [], credits: 3,
    structural: [{ type: 'regex', pattern: '\\btests?\\b', flags: 'i', message: 'Requires tests', weight: 1 }, { type: 'regex', pattern: 'secret', flags: 'i', message: 'Forbids committing secrets', weight: 1 }, { type: 'regex', pattern: 'typescript', flags: 'i', message: 'Names the TypeScript stack', weight: 1 }] },
  { slug: 'cursor-2', language: 'cursor', ordinal: 2, title: 'Agent prompts', difficulty: 'beginner', instructions: '# Agent prompts\n\nWrite an agent prompt with four labelled sections: **Role**, **Context**, **Task**, **Format**.', checks: ['Role section', 'Context section', 'Task section', 'Format section'], starter: '', solution: '## Role\nYou are a senior TypeScript engineer working in a legal-tech codebase.\n\n## Context\nThe repo is a monorepo (apps/api, apps/web). Grading runs in Judge0.\n\n## Task\nAdd input validation to POST /api/v1/ide/run and write a test for the 400 path.\n\n## Format\nReturn a unified diff and a two-line summary.\n', hints: ['Use headings for the four sections.'], tests: [], credits: 3,
    structural: [{ type: 'regex', pattern: '^\\s*#*\\s*role\\b', flags: 'im', message: 'Role section', weight: 1 }, { type: 'regex', pattern: '^\\s*#*\\s*context\\b', flags: 'im', message: 'Context section', weight: 1 }, { type: 'regex', pattern: '^\\s*#*\\s*task\\b', flags: 'im', message: 'Task section', weight: 1 }, { type: 'regex', pattern: '^\\s*#*\\s*format\\b', flags: 'im', message: 'Format section', weight: 1 }] },
  { slug: 'cursor-3', language: 'cursor', ordinal: 3, title: 'Agent Task Spec', difficulty: 'intermediate', instructions: '# Agent Task Spec\n\nSpecify a task for an agent to build a clause linter: a **Goal**, at least **three acceptance criteria** as a checklist (`- [ ]`), and an explicit **Out of scope** section.', checks: ['Goal stated', '≥ 3 acceptance criteria', 'Out of scope section'], starter: '# Task: clause linter\n\n## Goal\n\n## Acceptance criteria\n\n## Out of scope\n', solution: '# Task: clause linter\n\n## Goal\nA CLI that flags IP-assignment clauses missing any of: assigns, copyright, consideration.\n\n## Acceptance criteria\n- [ ] `lint <file>` prints one line per finding with line numbers\n- [ ] Exit code 1 when findings exist, 0 otherwise\n- [ ] Unit tests cover the three terms and case-insensitivity\n- [ ] README documents usage\n\n## Out of scope\n- Arabic clauses (separate task)\n- Editor integration\n', hints: ['Checklists use "- [ ]".'], tests: [], credits: 10,
    structural: [{ type: 'regex', pattern: '##\\s*goal\\s*\\n\\s*\\S', flags: 'i', message: 'Goal stated', weight: 1 }, { type: 'regex', pattern: '(-\\s*\\[[ x]\\][^\\n]*\\n?){3,}', flags: 'i', message: 'At least three acceptance criteria', weight: 2 }, { type: 'regex', pattern: 'out of scope\\s*\\n\\s*\\S', flags: 'i', message: 'Out of scope section', weight: 1 }] }
];

export const EXERCISES: SeedExercise[] = [
  ...HTML,
  ...LANGUAGES.filter((l) => l.grading === 'stdio').flatMap((l) => stdio(l.slug)),
  ...N8N,
  ...CURSOR
];
