import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Calendar, Users, UserCheck } from 'lucide-react';
import { User } from '../types';
import { signup, login } from '../api';
import { toast } from 'sonner';

interface LoginPageProps {
  onLogin: (user: User, token: string) => void;
  onForgotPassword: () => void;
}

export function LoginPage({ onLogin, onForgotPassword }: LoginPageProps) {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<'ORGANIZER' | 'ATTENDEE'>('ATTENDEE');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await login({ email: loginEmail, password: loginPassword });
      console.log('Login response - User:', data.user);
      console.log('Login response - User role:', data.user?.role);
      localStorage.setItem('app_token', data.token);
      // Ensure user object has role from backend
      if (data.user && !data.user.role) {
        console.warn('User object missing role, decoding from JWT');
        const decoded = JSON.parse(atob(data.token.split('.')[1]));
        data.user.role = decoded.role || 'ATTENDEE';
      }
      onLogin(data.user, data.token);
      toast.success('Login successful!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (!regName || !regEmail || !regPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!regRole) {
      toast.error('Please select a role');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await signup({ 
        name: regName, 
        email: regEmail, 
        password: regPassword,
        role: regRole
      });
      console.log('Signup response:', data);
      console.log('Signup - User role from backend:', data.user?.role);
      console.log('Signup - Selected role:', regRole);
      
      // Verify role matches what we sent
      if (data.user && data.user.role !== regRole) {
        console.warn(`Role mismatch! Sent: ${regRole}, Received: ${data.user.role}`);
        // Force the role we selected
        data.user.role = regRole;
      }
      
      localStorage.setItem('app_token', data.token);
      onLogin(data.user, data.token);
      toast.success('Registration successful!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
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
                      disabled={isLoading}
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
                      disabled={isLoading}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-[#0F6AB4] hover:bg-[#0D5A9A]"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>

                  <p className="text-center text-sm text-gray-600">
                    Forgot your password?{' '}
                    <button
                      type="button"
                      onClick={onForgotPassword}
                      className="text-[#0F6AB4] hover:underline cursor-pointer"
                    >
                      Reset it
                    </button>
                  </p>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label className="mb-3 block">I want to sign up as:</Label>
                    <RadioGroup 
                      value={regRole} 
                      onValueChange={(value) => setRegRole(value as 'ORGANIZER' | 'ATTENDEE')}
                      className="grid grid-cols-2 gap-3"
                    >
                      <label
                        htmlFor="role-organizer"
                        className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          regRole === 'ORGANIZER'
                            ? 'border-[#0F6AB4] bg-[#0F6AB4]/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <RadioGroupItem value="ORGANIZER" id="role-organizer" className="sr-only" />
                        <Users className={`w-6 h-6 mb-2 ${regRole === 'ORGANIZER' ? 'text-[#0F6AB4]' : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium ${regRole === 'ORGANIZER' ? 'text-[#0F6AB4]' : 'text-gray-700'}`}>
                          Organizer
                        </span>
                        <span className="text-xs text-gray-500 mt-1 text-center">Create & manage events</span>
                      </label>
                      <label
                        htmlFor="role-attendee"
                        className={`flex flex-col items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          regRole === 'ATTENDEE'
                            ? 'border-[#28A9A1] bg-[#28A9A1]/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <RadioGroupItem value="ATTENDEE" id="role-attendee" className="sr-only" />
                        <UserCheck className={`w-6 h-6 mb-2 ${regRole === 'ATTENDEE' ? 'text-[#28A9A1]' : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium ${regRole === 'ATTENDEE' ? 'text-[#28A9A1]' : 'text-gray-700'}`}>
                          Attendee
                        </span>
                        <span className="text-xs text-gray-500 mt-1 text-center">Join & RSVP to events</span>
                      </label>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      type="text" 
                      placeholder="John Doe"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required 
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                      disabled={isLoading}
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
                      disabled={isLoading}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-[#0F6AB4] hover:bg-[#0D5A9A]"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Create Account'}
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
