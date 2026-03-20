"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ApiClientError, apiFetch } from "@/lib/api-client";

const schema = z.object({
  name: z.string().min(1).max(120),
  avatarUrl: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.union([z.string().url(), z.literal("")])),
});

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", avatarUrl: "" },
  });

  const watchedAvatar = useWatch({ control: form.control, name: "avatarUrl" });
  const watchedName = useWatch({ control: form.control, name: "name" });
  const previewUrl =
    typeof watchedAvatar === "string" && z.string().url().safeParse(watchedAvatar).success
      ? watchedAvatar
      : "";

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name,
        avatarUrl: user.avatarUrl ?? "",
      });
    }
  }, [user, form]);

  const mut = useMutation({
    mutationFn: (body: z.infer<typeof schema>) =>
      apiFetch("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: body.name,
          avatarUrl: body.avatarUrl === "" ? null : body.avatarUrl,
        }),
      }),
    onSuccess: async () => {
      await refreshUser();
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Profile updated");
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "Failed"),
  });

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Profile and preferences.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => mut.mutate(v))}
              className="space-y-4"
            >
              <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
                <Avatar className="size-16">
                  {previewUrl ? (
                    <AvatarImage
                      key={previewUrl}
                      src={previewUrl}
                      alt=""
                      className="object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="text-lg">
                    {(watchedName || user?.name || "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-0.5 text-sm">
                  <p className="font-medium">Preview</p>
                  <p className="text-muted-foreground">
                    Updates as you type a valid image URL.
                  </p>
                </div>
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={mut.isPending}>
                Save changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
