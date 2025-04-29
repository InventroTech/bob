import * as React from 'react';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';

export default function StatusCard({text,color,type}) {
  return (
    <Stack spacing={1} sx={{ alignItems: 'center' }}>
      <Stack direction="row" spacing={1}>
        {type==="chip" ? <Chip label={text} color={color} variant="outlined" style={{backgroundColor:color,padding:'0px'}} className='p-0'/> : <Chip label={text} color={color} />}
      </Stack>
    </Stack>
  );
}