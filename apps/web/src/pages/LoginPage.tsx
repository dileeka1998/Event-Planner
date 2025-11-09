import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Calendar } from 'lucide-react';
import { signup as apiSignup } from '../api';

interface LoginPageProps {
  onLogin: (credentials: any) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({ email: loginEmail, password: loginPassword });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      alert("Passwords don't match");
      return;
    }
    try {
      const { data } = await apiSignup({ name: regName, email: regEmail, password: regPassword });
      // Automatically log in the user after successful registration
      onLogin({ email: regEmail, password: regPassword });
    } catch (error) {
      console.error('Registration failed', error);
      // Show an error to the user
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F6AB4] to-[#28A9A1] flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Side - Branding */}
        <div className="text-white space-y-6 hidden lg:block">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center">
              <Calendar className="w-10 h-10 text-[#0F6AB4]" />
            </div>
            <div>
              <h1 className="text-white text-4xl">EventAI</h1>
              <p className="text-white/90">Smart Event Planner</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-white text-3xl">AI-Powered Event Management</h2>
            <p className="text-white/90 text-lg">
              Streamline your event planning with intelligent scheduling, budget tracking, and personalized recommendations.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <p className="text-white/90">Automated AI scheduling with OR-Tools</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <p className="text-white/90">Smart budget optimization</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <p className="text-white/90">Personalized session recommendations</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login/Register Form */}
        <Card className="shadow-2xl">
          <CardContent className="p-8">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required 
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required 
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-[#0F6AB4] hover:bg-[#0D5A9A]"
                  >
                    Login
                  </Button>

                  <p className="text-center text-sm text-gray-600">
                    Forgot your password? <a href="#" className="text-[#0F6AB4] hover:underline">Reset it</a>
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      type="text" 
                      placeholder="John Doe"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required 
                    />
                  </div>

                  <div>
                    <Label htmlFor="reg-email">Email</Label>
                    <Input 
                      id="reg-email" 
                      type="email" 
                      placeholder="your@email.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required 
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="reg-password">Password</Label>
                    <Input 
                      id="reg-password" 
                      type="password" 
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      required 
                    />
                  </div>

                  <div>
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      placeholder="••••••••"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      required 
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-[#0F6AB4] hover:bg-[#0D5A9A]"
                  >
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
