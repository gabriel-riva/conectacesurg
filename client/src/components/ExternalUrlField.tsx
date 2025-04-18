import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ExternalLink } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

type ExternalUrlFieldProps = {
  form: UseFormReturn<any>;
};

export function ExternalUrlField({ form }: ExternalUrlFieldProps) {
  return (
    <FormField
      control={form.control}
      name="externalUrl"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Link Externo (opcional)</FormLabel>
          <FormControl>
            <div className="flex items-center">
              <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
              <Input 
                {...field} 
                placeholder="https://exemplo.com/mais-informacoes"
              />
            </div>
          </FormControl>
          <FormDescription>
            Um link externo para mais informações sobre o evento. Será exibido como "Mais detalhes" no popup do evento.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}