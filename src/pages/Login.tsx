import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const Login = () => {
  const { isAuthenticated, login, getUsers } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'error' | 'success'>('error');
  const [users, setUsers] = useState<Array<{ id: string; username: string; name: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Load users on component mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const userList = await getUsers();
        const loadedUsers = userList.map(user => ({ id: user.id, username: user.username, name: user.name }));
        
        // If no users found, add the default admin user as an option
        if (loadedUsers.length === 0) {
          setUsers([
            { id: 'admin', username: 'admin', name: 'Administrator (Default)' }
          ]);
        } else {
          setUsers(loadedUsers);
        }
      } catch (error) {
        logger.error('Failed to load users', error);
        // Fallback to default admin user
        setUsers([
          { id: 'admin', username: 'admin', name: 'Administrator (Default)' }
        ]);
      }
    };
    loadUsers();
  }, [getUsers]);

  // Update username when user is selected
  useEffect(() => {
    if (selectedUserId === 'manual-entry') {
      setShowManualEntry(true);
      setUsername('');
    } else if (selectedUserId) {
      setShowManualEntry(false);
      const selectedUser = users.find(user => user.id === selectedUserId);
      if (selectedUser) {
        setUsername(selectedUser.username);
      }
    }
  }, [selectedUserId, users]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const result = await login(username, password);
    if (!result.success) {
      setMessageType('error');
      setMessage(result.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-medium">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-32 h-10 rounded-xl flex items-center justify-center">
            <img src="./logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Login
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Choose a user or enter credentials" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="manual-entry">
                    ✏️ Enter Credentials
                  </SelectItem>
                </SelectContent>
              </Select>
              {username && !showManualEntry && (
                <div className="text-sm text-muted-foreground mt-1">
                  Username: {username}
                </div>
              )}
            </div>
            
            {showManualEntry && (
              <div className="space-y-2">
                <Label htmlFor="manual-username">Username</Label>
                <Input
                  id="manual-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoFocus={!showManualEntry}
              />
            </div>
            
            {message && (
              <Alert variant={messageType === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            
            <Button type="submit" className="w-full">
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;