"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

interface PolicyMetadataFormProps {
  onSubmit: (metadata: {
    entidade: string;
    area: string;
    tipologia: string;
  }) => void;
  onCancel: () => void;
}

const ENTIDADES = ["FIERGS", "SESI", "SENAI", "IEL", "CIERGS"] as const;

export function PolicyMetadataForm({
  onSubmit,
  onCancel,
}: PolicyMetadataFormProps) {
  const [entidade, setEntidade] = useState<string>("");
  const [area, setArea] = useState<string>("");
  const [tipologia, setTipologia] = useState<string>("");
  const [errors, setErrors] = useState<{
    entidade?: string;
    area?: string;
    tipologia?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!entidade) {
      newErrors.entidade = "Entidade é obrigatória";
    }

    if (!area) {
      newErrors.area = "Área é obrigatória";
    } else if (area.length < 2 || area.length > 10) {
      newErrors.area = "Área deve ter entre 2 e 10 caracteres";
    } else if (!/^[A-Z0-9]+$/.test(area)) {
      newErrors.area = "Área deve ser uma sigla sem espaços (ex: RH, TI, FIN)";
    }

    if (!tipologia) {
      newErrors.tipologia = "Tipologia é obrigatória";
    } else if (tipologia.length < 2 || tipologia.length > 20) {
      newErrors.tipologia = "Tipologia deve ter entre 2 e 20 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit({
        entidade,
        area: area.toUpperCase(),
        tipologia: tipologia.toUpperCase(),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Dados da Política</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          Preencha os dados básicos da política antes de iniciar o chat com a
          IA.
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Entidade */}
          <div className="space-y-2">
            <label
              htmlFor="entidade"
              className="text-sm font-medium leading-none"
            >
              Entidade <span className="text-destructive">*</span>
            </label>
            <select
              id="entidade"
              value={entidade}
              onChange={(e) => setEntidade(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Selecione a entidade</option>
              {ENTIDADES.map((ent) => (
                <option key={ent} value={ent}>
                  {ent}
                </option>
              ))}
            </select>
            {errors.entidade && (
              <p className="text-sm text-destructive">{errors.entidade}</p>
            )}
          </div>

          {/* Área */}
          <div className="space-y-2">
            <label htmlFor="area" className="text-sm font-medium leading-none">
              Área <span className="text-destructive">*</span>
            </label>
            <Input
              id="area"
              type="text"
              placeholder="RH, TI, FIN, etc."
              value={area}
              onChange={(e) => {
                const value = e.target.value.toUpperCase();
                // Apenas letras e números, sem espaços
                if (/^[A-Z0-9]*$/.test(value)) {
                  setArea(value);
                }
              }}
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">
              Sigla da área sem espaços (ex: RH, TI, FIN)
            </p>
            {errors.area && (
              <p className="text-sm text-destructive">{errors.area}</p>
            )}
          </div>

          {/* Tipologia */}
          <div className="space-y-2">
            <label
              htmlFor="tipologia"
              className="text-sm font-medium leading-none"
            >
              Tipologia <span className="text-destructive">*</span>
            </label>
            <Input
              id="tipologia"
              type="text"
              placeholder="POL, PROC, INST, etc."
              value={tipologia}
              onChange={(e) => setTipologia(e.target.value.toUpperCase())}
              maxLength={20}
            />
            <p className="text-xs text-muted-foreground">
              Tipo de documento (ex: POL, PROC, INST)
            </p>
            {errors.tipologia && (
              <p className="text-sm text-destructive">{errors.tipologia}</p>
            )}
          </div>

          {/* Preview do código */}
          {entidade && area && tipologia && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Código que será gerado:
              </p>
              <p className="mt-1 font-mono text-sm font-semibold text-primary">
                {entidade}-{area}-{tipologia}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Próximo
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
