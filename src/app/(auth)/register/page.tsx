"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: SignUpInput) => {
    setLoading(true);
    try {
      const result = await signUp.email({
        email: data.email,
        password: data.password,
        name: data.fullName,
        callbackURL: "/dashboard",
      });
      if (result.error) throw new Error(result.error.message || "Unable to create this account.");
      toast.success("Account created successfully!");
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create account. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="space-y-1 p-0 pb-6 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">
          Create an account
        </CardTitle>
        <CardDescription>
          Enter your details to create a participant account
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name (as per IC)</Label>
            <Input
              id="fullName"
              placeholder="Ahmad bin Ali"
              {...register("fullName")}
              disabled={loading}
              className={errors.fullName ? "border-error-500 focus-visible:ring-error-500" : ""}
            />
            {errors.fullName && (
              <p className="text-xs font-medium text-error-600 dark:text-error-400">
                {errors.fullName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              {...register("email")}
              disabled={loading}
              className={errors.email ? "border-error-500 focus-visible:ring-error-500" : ""}
            />
            {errors.email && (
              <p className="text-xs font-medium text-error-600 dark:text-error-400">
                {errors.email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register("password")}
              disabled={loading}
              className={errors.password ? "border-error-500 focus-visible:ring-error-500" : ""}
            />
            {errors.password && (
              <p className="text-xs font-medium text-error-600 dark:text-error-400">
                {errors.password.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              {...register("confirmPassword")}
              disabled={loading}
              className={errors.confirmPassword ? "border-error-500 focus-visible:ring-error-500" : ""}
            />
            {errors.confirmPassword && (
              <p className="text-xs font-medium text-error-600 dark:text-error-400">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 rounded-lg shadow-sm transition" disabled={loading}>
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto" />
            ) : (
              "Sign Up"
            )}
          </Button>
          <p className="text-center text-[11px] leading-relaxed text-neutral-500">
            By creating an account, you agree to the <Link href="/terms" className="font-semibold text-primary-600 hover:underline">Terms</Link> and acknowledge the <Link href="/privacy" className="font-semibold text-primary-600 hover:underline">Privacy Notice</Link>.
          </p>
        </form>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-center gap-1 p-0 pt-6 text-center text-sm text-neutral-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          Sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
