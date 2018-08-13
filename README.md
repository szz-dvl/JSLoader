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

To install python please refer to [this](https://wiki.python.org/moin/BeginnersGuide/Download) link.


## Getting Started

For GNU/Linux based OS users:

```
git clone https://github.com/szz-dvl/JSLoader.git
cd JSLoader
./build

```

This must be enou
   


### Installing

A step by step series of examples that tell you how to get a development env running

Say what the step will be

```
Give the example
```

And repeat

```
until finished
```

End with an example of getting some data out of the system or using it for a little demo

## Running the tests

Explain how to run the automated tests for this system

### Break down into end to end tests

Explain what these tests test and why

```
Give an example
```

### And coding style tests

Explain what these tests test and why

```
Give an example
```

## Deployment

Add additional notes about how to deploy this on a live system

## Built With

* [Dropwizard](http://www.dropwizard.io/1.0.2/docs/) - The web framework used
* [Maven](https://maven.apache.org/) - Dependency Management
* [ROME](https://rometools.github.io/rome/) - Used to generate RSS Feeds

## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/your/project/tags). 

## Authors

* **Billie Thompson** - *Initial work* - [PurpleBooth](https://github.com/PurpleBooth)

See also the list of [contributors](https://github.com/your/project/contributors) who participated in this project.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

* Hat tip to anyone whose code was used
* Inspiration
* etc

