# Configuration toolkit

Works along the Ansible playbooks to create clean & reliable dotenv configs to use in local / test envs.

## Usage

```
configurator.js [command]

Commands:
  configurator.js create [app]  start the server

Options:
      --help            Show help                                      [boolean]
      --version         Show version number                            [boolean]
  -p, --app-path        The app path - defaults to ./../[app]           [string]
  -n, --playbooks-path  The playbooks path - defaults to
                        ./../ansible/volume/playbooks                   [string]
  -c, --conf-path       The conf path - defaults to ./../ansible/volume/conf
                                                                        [string]
  -t, --force-http      Force all the URLs to be with an http:// scheme[boolean]
```

### Example for local environments

```
> node configurator.js create matches --conf-path ./../ansible-secrets-local/conf --force-http true

Writing configuration of calendar
{
  app: 'calendar',
  appPath: './../calendar',
  playbooksPath: './../ansible/volume/playbooks',
  confPath: './../ansible-secrets-local/conf',
  forceHttp: true
}

Delete ./../calendar/.env
⚠️   Cannot delete base env file - does the file exist?

Fetching playbook in ./../ansible/volume/playbooks/deploy-calendar.yaml
✔️   Playbook fetched

Fetching inventory in ./../ansible-secrets-local/conf/inventory.yaml
✔️   Config fetched
 
Generating conf
✔️   Conf generated

Writing conf
✔️   Conf wrote

Configuration of calendar written under ./../calendar/.env
```
