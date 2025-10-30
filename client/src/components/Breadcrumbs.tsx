import { Link } from "wouter";
import { Home } from "lucide-react";
import { BreadcrumbSchema } from "./StructuredData";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItemType {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItemType[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const allItems = [{ label: "Home", href: "/" }, ...items];
  
  const schemaItems = allItems.map(item => ({
    name: item.label,
    url: item.href
  }));

  return (
    <>
      <BreadcrumbSchema items={schemaItems} />
      
      <div className="container mx-auto px-4 py-4">
        <Breadcrumb>
          <BreadcrumbList>
            {allItems.map((item, index) => {
              const isLast = index === allItems.length - 1;
              const isHome = index === 0;
              
              return (
                <div key={item.href} className="flex items-center">
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage>
                        {isHome && <Home className="w-4 h-4 mr-1 inline" />}
                        {item.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link href={item.href} className="flex items-center gap-1">
                          {isHome && <Home className="w-4 h-4" />}
                          {item.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  
                  {!isLast && <BreadcrumbSeparator />}
                </div>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </>
  );
}
