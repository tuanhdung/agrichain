// Điểm nạp duy nhất của lớp api/ — gộp lại gần giống hệt shape của
// `AgriChain.api` ở js/api.js gốc, để mental model chuyển thẳng được: chỗ
// nào trang .html cũ gọi `AgriChain.api.supplies.list(...)` thì trang React
// gọi `api.supplies.list(...)` (import { api } from '../api'), khác đúng 1
// chỗ là `import` thay vì biến global `window.AgriChain`.
import { auth } from './http';
import { supplies } from './supplies';
import { workflowTemplates } from './workflowTemplates';
import { farms } from './farms';
import { seasons } from './seasons';
import { batches } from './batches';
import { certifications } from './certifications';
import { logs } from './logs';
import { system } from './system';
import { categories } from './categories';
import { products } from './products';
import { users } from './users';
import { roles } from './roles';
import { permissions } from './permissions';
import {
  getAccountType,
  getOrganizationId,
  getUser,
  hasPermission,
  isBusiness,
  isDistributor,
  isLoggedIn,
  isPlatformAdmin,
  isRemembered
} from './session';

export const api = {
  auth,
  supplies,
  workflowTemplates,
  farms,
  seasons,
  batches,
  certifications,
  logs,
  system,
  categories,
  products,
  users,
  roles,
  permissions,
  isLoggedIn,
  hasPermission,
  getUser,
  getAccountType,
  isBusiness,
  isPlatformAdmin,
  isDistributor,
  getOrganizationId,
  isRemembered
};

export { ApiError } from './error';
export type { User, AccountType, Page, MeResponse, TokenPair } from './types';
export type { Supply, SupplyPayload, SupplyListParams } from './supplies';
export type { WorkflowTemplate, TemplateStep, WorkflowTemplatePayload, WorkflowTemplateListParams } from './workflowTemplates';
export type { Farm, FarmPoint, FarmPayload, FarmListParams } from './farms';
export type { Season, SeasonPayload, SeasonWorkflowFields, SeasonListParams, WorkflowStep } from './seasons';
export type { Batch, BatchPayload, BatchListParams } from './batches';
export type { Certification, CertificationDetail, CertificationPayload, CertificationListParams } from './certifications';
export type { Log, LogDetail, LogPayload, LogSupply, LogImage, LogImageDetail, LogListParams } from './logs';
export type {
  SupplySystemRow,
  WorkflowTemplateSystemRow,
  FarmSystemRow,
  BatchSystemRow,
  CertificationSystemRow,
  SeasonSystemRow,
  LogSystemRow
} from './system';
export type { OrgUser, UserCreatePayload, UserUpdatePayload, UserListParams, TransferAdminPayload } from './users';
export type { Role, RoleCreatePayload, RoleUpdatePayload } from './roles';
export type { Permission, PermissionGroup } from './permissions';
export type { Category, CategoryType, CategoryPayload, CategoryUpdatePayload, CategoryListParams } from './categories';
export type { Product, ProductListItem, ProductStatus, ProductPayload, ProductUpdatePayload, ProductListParams } from './products';
export type {
  AdminOrder,
  OrderItem,
  OrderListParams,
  OrderStats,
  OrderStatus,
  PaymentStatus,
  SystemUser,
  SystemUserSummary
} from './orders';
