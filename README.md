# JSLoader

JSLoader is an browser extension developed for Firefox. Its goal is to give to the user the ability to store scripts for any page allowing them to run. Those scripts will be executed against page content
everytime the user visit the target site. The extension is not yet signed, hence Firefox developer edition is yet needed to run it.


### Prerequisites

To enjoy all the functionality the extension offers an instance of mongodb and python must be installed in the machine. For ubuntu or debian based distros:

- MongoDB:

```
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 9DA31620334BD75D9DCB49F368818C72E52529D4

```
Now depending on your distro you must add the mongo db repositories in [sources lists](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/#create-a-list-file-for-mongodb)

And install the latest version of MongoDB:

```
sudo apt-get update
sudo apt-get install -y mongodb-org

```

More detailed information can be found at: [MongoDB](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)

If you are using any other GNU/Linux distribution [this](https://docs.mongodb.com/manual/administration/install-on-linux/) link may be usefull to you.
For other OS please refer to [this](https://docs.mongodb.com/manual/installation/) link.

- Python:

To install python please refer to [this](https://wiki.python.org/moin/BeginnersGuide/Download) link. Once python is installed make sure [pip](https://pip.pypa.io/en/stable/installing/) is installed
and then install [pymongo](http://api.mongodb.com/python/current/installation.html) the database connector for MongoDB.

With all this dependencies satisfied you are now ready to go.

### Installing

For GNU/Linux based OS users:

```
git clone https://github.com/szz-dvl/JSLoader.git
cd JSLoader
./build

```

This must be enough to create the .xpi (** jsload-unsigned.xpi **) and install the native app.

There is no support at this point for windows users, however to create the .xpi just zip all the extension and renameit to anything ".xpi". To install the native app please follow [this](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_manifests) manuals.

## Getting Started

Once the extension is installed you will se a new page action available![alt text](https://github.com/szz-dvl/JSLoader/blob/master/fg/icons/blue-diskette-16.png) in the pages that are sensible to allow scripts. 

## Built With

* [ACE editor](https://ace.c9.io/) - The code editor used
* [GitHub](https://github.com/) - Hosting

## Contributing

Mail me if you want to lend a hand.

## Authors

* **Szz** - *Initial work* - [PurpleBooth](https://github.com/PurpleBooth)

See also the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License

This project is licensed under the Affero GPL license - see the [LICENSE](LICENSE) file for details

## Acknowledgments

* Any one using this project

