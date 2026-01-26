import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CommissionChartsProps {
  data: {
    timeSeries: { date: string; value: number }[];
    byProfessional: { name: string; value: number }[];
    byStatus: { name: string; value: number }[];
  } | undefined;
  isLoading: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--muted-foreground))'];
const BAR_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
  }).format(value);
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        <p className="text-sm font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm text-muted-foreground">
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export function CommissionCharts({ data, isLoading }: CommissionChartsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[300px] w-full" />
        ))}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const formattedTimeSeries = data.timeSeries.map(item => ({
    ...item,
    label: format(new Date(item.date), 'dd/MM', { locale: ptBR }),
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Time Series Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base font-medium">Comissões ao longo do tempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            {formattedTimeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedTimeSeries}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tickFormatter={formatCurrency} 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    name="Comissão"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            {data.byStatus.some(item => item.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data.byStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Sem dados
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* By Professional Bar Chart */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-base font-medium">Comissões por Profissional (Top 10)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            {data.byProfessional.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byProfessional} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis 
                    type="number" 
                    tickFormatter={formatCurrency}
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="value" 
                    name="Comissão"
                    radius={[0, 4, 4, 0]}
                  >
                    {data.byProfessional.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Sem dados para o período selecionado
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
