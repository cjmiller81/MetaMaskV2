'use client';

import {
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  Box,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Checkbox,
  Alert,
  Snackbar
} from '@mui/material';
import { useState, useEffect } from 'react';
import { connectMetaMask, isMetaMaskInstalled, setupAccountChangeListener, getAccountHoldings, type Account, type TokenHolding } from '@/lib/metamask';

export default function CurrentPosition() {
  const [walletService, setWalletService] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (walletService === 'metamask') {
      setupAccountChangeListener(async (newAccounts) => {
        try {
          const accountsWithHoldings = await Promise.all(
            newAccounts.map(async (address) => {
              const holdings = await getAccountHoldings(address);
              return { address, holdings };
            })
          );
          setAccounts(accountsWithHoldings);
          if (accountsWithHoldings.length > 0) {
            setSelectedAccount(accountsWithHoldings[0].address);
            setHoldings(accountsWithHoldings[0].holdings);
          }
        } catch (err) {
          console.error('Error updating accounts:', err);
        }
      });
    }
  }, [walletService]);

  useEffect(() => {
    const updateHoldings = async () => {
      if (selectedAccount) {
        const newHoldings = await getAccountHoldings(selectedAccount);
        setHoldings(newHoldings);
      }
    };
    updateHoldings();
  }, [selectedAccount]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleWalletServiceChange = async (value: string) => {
    if (value === 'metamask') {
      try {
        if (!isMetaMaskInstalled()) {
          setError('MetaMask is not installed. Please install MetaMask to continue.');
          setWalletService('');
          return;
        }

        const newAccounts = await connectMetaMask();
        setAccounts(newAccounts);
        if (newAccounts.length > 0) {
          setSelectedAccount(newAccounts[0].address);
          setHoldings(newAccounts[0].holdings);
        }
        setWalletService(value);
        setError(null);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Failed to connect to MetaMask');
        }
        setWalletService('');
      }
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleHoldingSelection = (index: number) => {
    const newHoldings = holdings.map((holding, i) => ({
      ...holding,
      selected: i === index ? !holding.selected : holding.selected,
    }));
    setHoldings(newHoldings);
  };

  return (
    <Card sx={{ 
      bgcolor: 'grey.900',
      color: 'common.white',
      minWidth: 800,
      p: 2
    }}>
      <CardContent>
        <Typography variant="h6" component="h2" gutterBottom>
          Current Position
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 4 }}>
          {/* Left side - Wallet controls */}
          <Box sx={{ width: '300px' }}>
            <Typography variant="subtitle1" gutterBottom>
              Web3 Wallets
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <Select
                value={walletService}
                onChange={(e) => handleWalletServiceChange(e.target.value)}
                displayEmpty
                renderValue={(selected) => {
                  if (selected === '') {
                    return 'Connect Wallet Service';
                  }
                  return 'MetaMask';
                }}
                sx={{
                  bgcolor: '#0091EA',
                  color: 'common.white',
                  '& .MuiSelect-icon': {
                    color: 'common.white',
                  },
                  '&:hover': {
                    bgcolor: '#0277BD',
                  },
                  height: '45px',
                }}
              >
                <MenuItem value="metamask">MetaMask</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="subtitle1" gutterBottom>
              Connected Wallet
            </Typography>
            <FormControl fullWidth>
              <Select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                displayEmpty
                disabled={!accounts.length}
                sx={{
                  bgcolor: 'common.white',
                  color: 'black',
                  '& .MuiSelect-icon': {
                    color: 'black',
                  },
                }}
              >
                {accounts.map((account) => (
                  <MenuItem key={account.address} value={account.address}>
                    <span>{formatAddress(account.address)}</span>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Right side - Table */}
          <Box sx={{ flex: 1 }}>
            <TableContainer component={Paper} sx={{ bgcolor: 'grey.900', color: 'common.white' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" sx={{ color: 'common.white' }}>
                      <Checkbox sx={{ color: 'common.white' }} />
                    </TableCell>
                    <TableCell sx={{ color: 'common.white' }}>Symbol</TableCell>
                    <TableCell sx={{ color: 'common.white' }}>Chain</TableCell>
                    <TableCell sx={{ color: 'common.white' }}>Qty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {holdings.length > 0 ? (
                    holdings
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((holding, index) => (
                        <TableRow key={`${holding.symbol}-${holding.chain}`}>
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={holding.selected || false}
                              onChange={() => handleHoldingSelection(index)}
                              sx={{ color: 'common.white' }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: 'common.white' }}>{holding.symbol}</TableCell>
                          <TableCell sx={{ color: 'common.white' }}>{holding.chain}</TableCell>
                          <TableCell sx={{ color: 'common.white' }}>{holding.quantity}</TableCell>
                        </TableRow>
                      ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ color: 'common.white' }}>
                        No rows
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination
                component="div"
                count={holdings.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                sx={{ 
                  color: 'common.white',
                  '.MuiTablePagination-selectIcon': {
                    color: 'common.white',
                  },
                  '.MuiTablePagination-select': {
                    color: 'common.white',
                  },
                }}
              />
            </TableContainer>
          </Box>
        </Box>

        <Snackbar 
          open={!!error} 
          autoHideDuration={6000} 
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setError(null)} 
            severity="error" 
            sx={{ width: '100%' }}
          >
            {error}
          </Alert>
        </Snackbar>
      </CardContent>
    </Card>
  );
}