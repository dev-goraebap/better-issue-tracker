import { installBackClose } from '@/shared/lib/back-close';

// Install before the router so Back closes the top overlay first.
installBackClose();
