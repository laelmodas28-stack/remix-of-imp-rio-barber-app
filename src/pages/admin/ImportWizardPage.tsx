import { useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { PageHeader } from "@/components/admin/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  ArrowLeft,
  ArrowRight,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Users,
  Scissors,
  UserCircle,
} from "lucide-react";

type ImportType = "clients" | "services" | "professionals";
type WizardStep = "upload" | "mapping" | "validation" | "importing" | "result";

interface FieldMapping {
  csvColumn: string;
  dbField: string;
}

const importTypeConfig: Record<ImportType, {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: { key: string; label: string; required: boolean }[];
}> = {
  clients: {
    title: "Clientes",
    icon: Users,
    fields: [
      { key: "full_name", label: "Nome Completo", required: true },
      { key: "email", label: "Email", required: false },
      { key: "phone", label: "Telefone", required: false },
      { key: "birth_date", label: "Data de Nascimento", required: false },
    ],
  },
  services: {
    title: "Servicos",
    icon: Scissors,
    fields: [
      { key: "name", label: "Nome", required: true },
      { key: "description", label: "Descricao", required: false },
      { key: "price", label: "Preco", required: true },
      { key: "duration", label: "Duracao (min)", required: true },
    ],
  },
  professionals: {
    title: "Profissionais",
    icon: UserCircle,
    fields: [
      { key: "name", label: "Nome", required: true },
      { key: "email", label: "Email", required: false },
      { key: "phone", label: "Telefone", required: false },
      { key: "specialty", label: "Especialidade", required: false },
    ],
  },
};

export function ImportWizardPage() {
  const { type } = useParams<{ type: ImportType }>();
  const navigate = useNavigate();
  const { baseUrl } = useBarbershopContext();

  const [step, setStep] = useState<WizardStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ success: number; errors: number; errorDetails: string[] } | null>(null);

  const config = type ? importTypeConfig[type as ImportType] : null;

  if (!config || !type) {
    navigate(`${baseUrl}/admin/imports`);
    return null;
  }

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      
      if (lines.length > 0) {
        const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
        setCsvColumns(headers);
        
        const data = lines.slice(1, 6).map((line) => 
          line.split(",").map((cell) => cell.trim().replace(/"/g, ""))
        );
        setCsvData(data);

        // Auto-map columns with similar names
        const autoMappings: FieldMapping[] = config.fields.map((field) => {
          const matchingColumn = headers.find(
            (col) => col.toLowerCase().includes(field.key.replace("_", " ").toLowerCase()) ||
                     col.toLowerCase().includes(field.label.toLowerCase())
          );
          return {
            dbField: field.key,
            csvColumn: matchingColumn || "",
          };
        });
        setMappings(autoMappings);
      }
    };
    reader.readAsText(uploadedFile);
  }, [config]);

  const updateMapping = (dbField: string, csvColumn: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.dbField === dbField ? { ...m, csvColumn } : m))
    );
  };

  const handleStartImport = () => {
    setStep("importing");
    
    // Simulate import progress
    let prog = 0;
    const interval = setInterval(() => {
      prog += Math.random() * 15;
      if (prog >= 100) {
        prog = 100;
        clearInterval(interval);
        setProgress(100);
        
        // Simulate result
        setTimeout(() => {
          setResult({
            success: csvData.length - 1,
            errors: 1,
            errorDetails: ["Linha 3: Email invalido"],
          });
          setStep("result");
        }, 500);
      } else {
        setProgress(prog);
      }
    }, 300);
  };

  const renderStep = () => {
    switch (step) {
      case "upload":
        return (
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Upload do Arquivo</CardTitle>
              <CardDescription>
                Selecione um arquivo CSV com os dados para importar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <FileSpreadsheet className="h-12 w-12 text-primary" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setCsvColumns([]);
                        setCsvData([]);
                      }}
                    >
                      Trocar arquivo
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Clique para selecionar</p>
                      <p className="text-sm text-muted-foreground">
                        ou arraste e solte um arquivo CSV
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {file && (
                <div className="mt-6 flex justify-end">
                  <Button onClick={() => setStep("mapping")} className="gap-2">
                    Proximo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case "mapping":
        return (
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Mapeamento de Campos</CardTitle>
              <CardDescription>
                Associe as colunas do seu CSV aos campos do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {config.fields.map((field) => {
                  const mapping = mappings.find((m) => m.dbField === field.key);
                  return (
                    <div key={field.key} className="flex items-center gap-4">
                      <div className="w-48">
                        <p className="text-sm font-medium">
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={mapping?.csvColumn || ""}
                        onValueChange={(value) => updateMapping(field.key, value)}
                      >
                        <SelectTrigger className="w-64">
                          <SelectValue placeholder="Selecione uma coluna" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {csvColumns.map((col) => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep("upload")} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={() => setStep("validation")} className="gap-2">
                  Proximo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "validation":
        return (
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Validacao dos Dados</CardTitle>
              <CardDescription>
                Confira uma amostra dos dados antes de importar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {config.fields.map((field) => (
                        <TableHead key={field.key}>{field.label}</TableHead>
                      ))}
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.map((row, index) => {
                      const hasError = index === 2; // Simulate error on row 3
                      return (
                        <TableRow key={index} className={hasError ? "bg-destructive/5" : ""}>
                          {config.fields.map((field) => {
                            const mapping = mappings.find((m) => m.dbField === field.key);
                            const colIndex = csvColumns.indexOf(mapping?.csvColumn || "");
                            return (
                              <TableCell key={field.key}>
                                {colIndex >= 0 ? row[colIndex] : "-"}
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            {hasError ? (
                              <div className="flex items-center gap-1 text-destructive">
                                <XCircle className="h-4 w-4" />
                                <span className="text-xs">Erro</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-success">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-xs">OK</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center gap-2 p-4 rounded-lg bg-warning/10 border border-warning/30">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                <p className="text-sm">
                  1 linha apresenta problemas e sera ignorada durante a importacao.
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep("mapping")} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={handleStartImport} className="gap-2">
                  Iniciar Importacao
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      case "importing":
        return (
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Importando Dados</CardTitle>
              <CardDescription>
                Aguarde enquanto processamos seu arquivo
              </CardDescription>
            </CardHeader>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full border-4 border-muted animate-pulse" />
                  <Upload className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary" />
                </div>
                <div className="w-full max-w-md space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className="text-center text-sm text-muted-foreground">
                    {Math.round(progress)}% concluido
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "result":
        return (
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Importacao Concluida</CardTitle>
              <CardDescription>
                Veja o resumo da importacao
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-success/10 border border-success/30">
                  <CheckCircle className="h-10 w-10 text-success" />
                  <div>
                    <p className="text-2xl font-bold text-success">{result?.success}</p>
                    <p className="text-sm text-muted-foreground">Registros importados</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                  <XCircle className="h-10 w-10 text-destructive" />
                  <div>
                    <p className="text-2xl font-bold text-destructive">{result?.errors}</p>
                    <p className="text-sm text-muted-foreground">Erros encontrados</p>
                  </div>
                </div>
              </div>

              {result?.errorDetails && result.errorDetails.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Detalhes dos erros:</p>
                  <div className="rounded-lg border border-border p-4 bg-muted/50">
                    {result.errorDetails.map((error, i) => (
                      <p key={i} className="text-sm text-muted-foreground">
                        {error}
                      </p>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Baixar Relatorio de Erros
                  </Button>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => navigate(`${baseUrl}/admin/imports`)}
                >
                  Voltar para Importacoes
                </Button>
                <Button
                  onClick={() => {
                    setStep("upload");
                    setFile(null);
                    setCsvColumns([]);
                    setCsvData([]);
                    setMappings([]);
                    setProgress(0);
                    setResult(null);
                  }}
                >
                  Nova Importacao
                </Button>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const Icon = config.icon;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Importar ${config.title}`}
        subtitle="Siga os passos para importar seus dados"
        backButton={{
          label: "Voltar",
          onClick: () => navigate(`${baseUrl}/admin/imports`),
          icon: ArrowLeft,
        }}
      />

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 py-4">
        {(["upload", "mapping", "validation", "importing", "result"] as WizardStep[]).map((s, i) => {
          const isActive = step === s;
          const isPast = ["upload", "mapping", "validation", "importing", "result"].indexOf(step) > i;
          
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isPast
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isPast ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              {i < 4 && (
                <div
                  className={`h-0.5 w-8 ${
                    isPast ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {renderStep()}
    </div>
  );
}

export default ImportWizardPage;
