import Paper from '@material-ui/core/Paper';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableContainer from '@material-ui/core/TableContainer';
import React from 'react';


export function ScrollableTable({ children }) {
    
    const useStyles = makeStyles({
        container: {
        maxHeight: 440, // Altura máxima con scroll automático
        },
    });
    const classes = useStyles();

  return (
    <Paper>
      <TableContainer className={classes.container}>
        <Table stickyHeader>{children}</Table>
      </TableContainer>
    </Paper>
  );
}
