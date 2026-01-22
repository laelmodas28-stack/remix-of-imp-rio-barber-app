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

  if (crumbs.length <= 1) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const fullPath = crumb.path ? `${adminBaseUrl}/${crumb.path}` : adminBaseUrl;

          return (
            <Fragment key={index}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="font-medium">{crumb.label}</BreadcrumbPage>
                ) : crumb.path !== "" ? (
                  <BreadcrumbLink asChild>
                    <Link to={fullPath} className="text-muted-foreground hover:text-foreground">
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <span className="text-muted-foreground">{crumb.label}</span>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export default AdminBreadcrumb;
