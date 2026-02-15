"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, User, Lock, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            router.push("/dashboard");
        }, 800);
    };

    const fillCredentials = (role: "admin" | "caseworker") => {
        if (role === "admin") {
            setEmail("admin@tracebridge.ai");
            setPassword("admin123");
        } else {
            setEmail("caseworker@redcross.org");
            setPassword("worker123");
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md border-none shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <img src="/logo.png" alt="TraceBridge" className="h-16 w-auto" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Crisis Response Portal</CardTitle>
                    <CardDescription>
                        Secure authentication for mission specialists and authorized caseworkers.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@agency.org"
                                    className="pl-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    className="pl-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-red-600 hover:bg-red-700 h-11"
                            disabled={isLoading}
                        >
                            {isLoading ? "Signing in..." : "Sign In"}
                            {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                        </Button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-muted-foreground font-medium">Demo Access</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            variant="outline"
                            className="h-12 border-slate-200 hover:bg-slate-50 hover:text-red-600 transition-all"
                            onClick={() => fillCredentials("admin")}
                        >
                            <Shield className="mr-2 h-4 w-4" />
                            <span>Admin</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-12 border-slate-200 hover:bg-slate-50 hover:text-red-600 transition-all"
                            onClick={() => fillCredentials("caseworker")}
                        >
                            <User className="mr-2 h-4 w-4" />
                            <span>Caseworker</span>
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col items-center justify-center border-t py-4 bg-slate-50/50 rounded-b-xl">
                    <p className="text-xs text-muted-foreground">
                        TraceBridge AI Crisis Reunification Platform
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
