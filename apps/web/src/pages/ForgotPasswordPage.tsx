import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Calendar, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '../api';
import { toast } from 'sonner';

interface ForgotPasswordPageProps {
  onBack: () => void;
  onResetRequested: (token: string) => void;
}

export function ForgotPasswordPage({ onBack, onResetRequested }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const { data } = await forgotPassword({ email });
      if (data.token) {
        toast.success('Password reset link generated successfully');
        onResetRequested(data.token);
      } else {
        toast.success(data.message || 'If an account with that email exists, a password reset link has been sent.');
        // Still redirect to reset page even if we don't have token (for security)
        // In a real app, the token would come from email
        onResetRequested('');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to request password reset. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F6AB4] to-[#28A9A1] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Left Side - Branding (hidden on mobile) */}
        <div className="text-white space-y-6 hidden lg:block mb-8">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center">
              <Calendar className="w-10 h-10 text-[#0F6AB4]" />
            </div>
            <div>
              <h1 className="text-white text-4xl">EventAI</h1>
              <p className="text-white/90">Smart Event Planner</p>
            </div>
          </div>
        </div>

        {/* Forgot Password Form */}
        <Card className="shadow-2xl">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Forgot Password?</h2>
                <p className="text-sm text-gray-600">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input 
                    id="forgot-email" 
                    type="email" 
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    disabled={isLoading}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-[#0F6AB4] hover:bg-[#0D5A9A]"
                  disabled={isLoading}
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>

              <Button 
                variant="ghost" 
                className="w-full text-[#0F6AB4] hover:text-[#0D5A9A]"
                onClick={onBack}
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
