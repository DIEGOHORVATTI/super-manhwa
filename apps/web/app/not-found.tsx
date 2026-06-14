import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function NotFound() {
  return (
    <div className="state-screen">
      <h1 className="state-title">404</h1>
      <p className="muted">Esta página não existe ou a obra saiu do catálogo.</p>
      <div className="state-actions">
        <Link className="pager-btn" href="/">
          <Icon name="house" size={16} /> Início
        </Link>
        <Link className="pager-btn" href="/">
          <Icon name="search" size={16} /> Explorar o catálogo
        </Link>
      </div>
    </div>
  );
}
