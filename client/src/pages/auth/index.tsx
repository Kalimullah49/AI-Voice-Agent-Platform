import { useState } from "react";
import { Link } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LoginForm from "@/components/auth/LoginForm";
import RegisterForm from "@/components/auth/RegisterForm";

import { AuthProvider } from "@/providers/AuthProvider";

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");

  return (
    <AuthProvider>
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="w-full max-w-5xl px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          <div className="flex flex-col justify-center">
            <Card className="border-none shadow-lg">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">
                  {activeTab === "login" ? "Welcome Back" : "Create Account"}
                </CardTitle>
                <CardDescription className="text-center">
                  {activeTab === "login" 
                    ? "Enter your credentials to access your account" 
                    : "Sign up to get started with Mind AI"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="login">Sign In</TabsTrigger>
                    <TabsTrigger value="register">Sign Up</TabsTrigger>
                  </TabsList>
                  <TabsContent value="login">
                    <LoginForm />
                  </TabsContent>
                  <TabsContent value="register">
                    <RegisterForm />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
          
          <div className="hidden md:flex flex-col justify-center">
            <div className="text-center space-y-6">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900">
                Power Your Business with AI Voice Agents
              </h1>
              <p className="text-lg text-gray-600">
                Mind AI is an advanced AI-powered platform designed to enhance your call center operations 
                across any industry, providing comprehensive communication tools and intelligent voice automation.
              </p>
              <div className="space-y-4 mt-8">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <svg className="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium">Smart Voice Agents</h3>
                    <p className="text-sm text-gray-600">Create intelligent agents that handle calls, appointments, and customer service</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <svg className="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium">Campaign Management</h3>
                    <p className="text-sm text-gray-600">Run automated outbound campaigns with detailed analytics and reporting</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <svg className="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h3 className="font-medium">Enterprise Ready</h3>
                    <p className="text-sm text-gray-600">Scale across teams with multi-user support and advanced integrations</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AuthProvider>
  );
}