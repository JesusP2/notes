import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

export const Route = createFileRoute('/auth/$id')({
  component: RouteComponent,
  ssr: false,
});

function RouteComponent() {
  return (
    <main className="mx-auto grid h-screen max-w-6xl place-items-center space-y-6 p-6">
      <Link
        className={buttonVariants({
          variant: 'ghost',
          className: 'absolute top-4 left-4',
        })}
        to="/"
      >
        <ArrowLeft className="h-4 w-4" />
        Go back
      </Link>
    </main>
  );
}
