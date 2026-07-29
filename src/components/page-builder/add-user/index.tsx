'use client';

import React from 'react';
import type { AddUserComponentProps } from './types';
import { useAddUser } from './useAddUser';
import { AddUserView } from './AddUserView';

/**
 * User management table/form for PageBuilder (add, edit, delete users).
 */
const AddUserComponent: React.FC<AddUserComponentProps> = (props) => {
  const model = useAddUser(props);
  return <AddUserView {...model} />;
};

export default AddUserComponent;
export type { AddUserComponentConfig, AddUserComponentProps } from './types';
