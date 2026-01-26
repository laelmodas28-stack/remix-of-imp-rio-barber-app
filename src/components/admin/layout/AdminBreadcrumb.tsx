import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useBarbershopContext } from "@/hooks/useBarbershopContext";
import { getBreadcrumbs } from "@/config/adminRoutes";
import { Fragment } from "react";

export function AdminBreadcrumb() {
  const location = useLocation();
  const { baseUrl } = useBarbershopContext();
  
  const adminBaseUrl = `${baseUrl}/admin`;
  const currentPath = location.pathname.replace(`${adminBaseUrl}/`, "").replace(adminBaseUrl, "");
  
  const crumbs = getBreadcrumbs(currentPath);
  const currentPage = crumbs.length > 0 ? crumbs[crumbs.length - 1].label : "Dashboard";

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage className="font-medium">{currentPage}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default AdminBreadcrumb;
