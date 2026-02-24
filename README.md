# My Engineering Project

Static HTML website migrated from Squarespace archive.

## Deployment

### GitHub Pages

1. Push the repository to GitHub (branch `main`).
2. The workflow in `.github/workflows/deploy-pages.yml` will run on push and publish the root directory.
3. A `CNAME` file is included with `myengineeringproject.com`; GitHub Pages will automatically use this custom domain after enabling Pages in repository settings.

### Cloudflare setup

1. In Cloudflare DNS for `myengineeringproject.com`, add a CNAME record pointing `www` to `<your-github-username>.github.io` (the Pages domain) or use an `A` record per GitHub Pages instructions.
2. Enable SSL/TLS (Full or Flexible) and ensure the custom domain is verified on GitHub Pages.
3. Set the default domain to `www.myengineeringproject.com` or root as desired.


## Asset updates

- Image links previously pointing at `./*_files/...` have been replaced with their CDN URLs.
- Place any additional images into `images/` and update references accordingly.

## Ad space

A fixed `#adspace` element at the bottom of each page reserves 10% of viewport height. Insert ad code or tracking scripts there.
