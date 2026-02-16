"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, User } from "lucide-react";

interface LoginModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
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
            onOpenChange(false);
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl font-bold">Welcome Back</DialogTitle>
                    <DialogDescription className="text-center">
                        Sign in to access the TraceBridge Command Center
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@agency.org"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleLogin} disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700">
                        {isLoading ? "Signing in..." : "Sign In"}
                    </Button>

                    <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        <Button variant="outline" className="w-full" onClick={() => { }} title="Google">
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => { }} title="Apple">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.38-1.09-.53-2.04-.56-3.14 0-1.14.58-2.2.66-3.15-.36-1.57-1.58-2.81-4.48-1.12-7.52 1.2-2.14 3.32-2.39 4.39-2.35 1.13.04 2.17.69 2.85.69.74 0 2.22-.92 3.76-.78 1.64.15 2.91.86 3.73 2.08-3.23 1.95-2.64 5.91.56 7.23-.42 1.17-1.02 2.34-1.85 3.19-.84.85-2.64 3.06-2.95 2.54zM12.98 2.93c-.88 1.15-2.06 1.77-3.16 1.69-.17-1.1.41-2.4 1.15-3.32.96-1.17 2.4-1.72 3.12-1.6 1.05.15.54 2.66-1.11 3.23z" />
                            </svg>
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => { }} title="Facebook">
                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="#1877F2">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => { }} title="X (Twitter)">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </Button>
                    </div>

                    <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Demo Access</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="secondary"
                            className="text-xs"
                            onClick={() => fillCredentials("admin")}
                        >
                            <Shield className="mr-2 h-3 w-3" />
                            Admin
                        </Button>
                        <Button
                            variant="secondary"
                            className="text-xs"
                            onClick={() => fillCredentials("caseworker")}
                        >
                            <User className="mr-2 h-3 w-3" />
                            Caseworker
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
