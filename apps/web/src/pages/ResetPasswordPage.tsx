import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Calendar, ArrowLeft } from 'lucide-react';
import { resetPassword } from '../api';
import { toast } from 'sonner';

interface ResetPasswordPageProps {
  token: string;
  onBack: () => void;
  onPasswordReset: () => void;
}

export function ResetPasswordPage({ token, onBack, onPasswordReset }: ResetPasswordPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (!token) {
      toast.error('Invalid reset token. Please request a new password reset.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword({ token, password, confirmPassword });
      toast.success('Password has been reset successfully!');
      onPasswordReset();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to reset password. Please try again.';
      toast.error(errorMessage);
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

        {/* Reset Password Form */}
        <Card className="shadow-2xl">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Reset Password</h2>
                <p className="text-sm text-gray-600">
                  Enter your new password below.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input 
                    id="new-password" 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>

                <div>
                  <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                  <Input 
                    id="confirm-new-password" 
                    type="password" 
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-[#0F6AB4] hover:bg-[#0D5A9A]"
                  disabled={isLoading}
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
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
